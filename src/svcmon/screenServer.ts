import * as blessed from "blessed";
import chalk from "chalk";
var contrib = require('blessed-contrib')

import {WatchEvent, transform, query, k8s} from "@carbonql/carbonql";
import * as ktail from "../ktail";
import * as api from "./api";

// --------------------------------------------------------------------------
// Server implementation.
// --------------------------------------------------------------------------

class ServiceSummary {
  public static readonly header = ["Service name", "Endpoints", "Pods"];
  private _pods: Map<string, k8s.IoK8sApiCoreV1Pod> = new Map();
  private _endpoints: Map<string, k8s.IoK8sApiCoreV1EndpointPort[]> = new Map();

  constructor(public readonly service: k8s.IoK8sApiCoreV1Service) {}

  public setPods(pods: Map<string, k8s.IoK8sApiCoreV1Pod>) {
    this._pods = pods;
  }

  public setEndpoints(endpoints: Map<string, k8s.IoK8sApiCoreV1EndpointPort[]>) {
    this._endpoints = endpoints;
  }

  public render(): string[][] {
    let rows: string[][] = [];

    // TODO: Add the pod status here.
    const podNames = new Set([...this._pods].map(([_, pod]) => pod.metadata.name));
    const endpointTargets = new Set([...this._endpoints].map(([podName]) => podName));

    // Break endpoints into three groups: (1) endpoints that refer to a pod that
    // exists, (2) endpoints that refer to a pod that does not exist, and (3)
    // pods with no endpoints that reference it.

    const matchedPods = new Set(
      [...podNames]
        .filter(podName => endpointTargets.has(podName)));

    const danglingPods = new Set(
      [...podNames].filter(podName => !endpointTargets.has(podName)));

    const danglingEndpoints = new Set(
      [...endpointTargets].filter(target => !podNames.has(target)));

    [...matchedPods]
      .sort((name1, name2) => name1.localeCompare(name2))
      .forEach(podName => {
        const eps = (this._endpoints.get(podName) || [])
          .map(ep => ep.port)
          .join(",");
        rows.push([`[${eps}]`, "->", podName, ...this.printStatus(podName)]);
      });

    [...danglingPods]
      .sort((name1, name2) => name1.localeCompare(name2))
      .forEach(podName => {
        rows.push([`${chalk.red("[NONE]")}`, "->", podName, ...this.printStatus(podName)]);
      });

    [...danglingEndpoints]
      .sort((name1, name2) => name1.localeCompare(name2))
      .forEach(podName => {
        const eps = (this._endpoints.get(podName) || [])
          .map(ep => ep.port)
          .join(",");
        rows.push([`[${eps}]`, "->", `${podName}`, ...this.printStatus(podName)]);
      });

    return rows;
  }

  private printStatus(key: string): [string, string] {
    const readyStatus = transform.core.v1.pod
      .getReadyStatus(<k8s.IoK8sApiCoreV1Pod>this._pods.get(key));

    const status = readyStatus.status == "True"
      ? chalk.green("READY")
      : chalk.red(`${readyStatus.reason}`);

    const message = readyStatus.message == null
      ? ""
      : readyStatus.message;

    return [status, message];
  }
}

// --------------------------------------------------------------------------
// Init dashboard.
// --------------------------------------------------------------------------

var screen = blessed.screen()

//create layout and widgets

var grid = new contrib.grid({rows: 12, cols: 12, screen: screen})

var gauge_two = grid.set(2, 9, 2, 3, contrib.gauge, {label: 'Deployment Progress', percent: 80})

var servicesTable =  grid.set(0, 0, 4, 6, contrib.table,
  { keys: true
  , fg: 'green'
  , label: 'Services'
  , columnSpacing: 1
  , columnWidth: [30, 15, 18, 18]
  , vi: true });

var podsTable =  grid.set(4, 0, 4, 6, contrib.table,
  { keys: true
  , fg: 'white'
  , label: 'Targeted Pods'
  , interactive: false
  , columnSpacing: 1
  , columnWidth: [10, 3, 25, 19, 80]
  , vi: true });

const serviceTableHeader = ['Endpoints', '', 'Pod name', 'Pod status', 'Message'];

// Populate endpoints and pods tables when user presses <return>.
let currKtailSub: query.Subscription | null = null;
servicesTable.rows.on('select', (item: any) => {
  const key = (<string>item.getText()).split(" ")[0].trim();
  activeKey = key;
  const summary = summaries.get(activeKey);
  if (summary != null) {
    podsTable.setData(
    { headers: serviceTableHeader
    , data: summary.render() });
  }

  const [ns, svcName] = key.split("/");
  log.destroy();
  if (currKtailSub != null) {
    currKtailSub.unsubscribe();
  }
  log = makeLog();
  currKtailSub = ktail
    .ktail(ns, RegExp(svcName, "g"), true)
    .subscribe(({name, logs}) => {
      log.log(`${chalk.green(name)}:`);
      logs.forEach(line => log.log(`${line}`))
    });
});


/*
 *
 * LCD Options
//these options need to be modified epending on the resulting positioning/size
  options.segmentWidth = options.segmentWidth || 0.06; // how wide are the segments in % so 50% = 0.5
  options.segmentInterval = options.segmentInterval || 0.11; // spacing between the segments in % so 50% = 0.5
  options.strokeWidth = options.strokeWidth || 0.11; // spacing between the segments in % so 50% = 0.5
//default display settings
  options.elements = options.elements || 3; // how many elements in the display. or how many characters can be displayed.
  options.display = options.display || 321; // what should be displayed before anything is set
  options.elementSpacing = options.spacing || 4; // spacing between each element
  options.elementPadding = options.padding || 2; // how far away from the edges to put the elements
//coloring
  options.color = options.color || "white";
*/
var lcdLineOne = grid.set(0,9,2,3, contrib.lcd,
  {
    label: "LCD Test",
    segmentWidth: 0.06,
    segmentInterval: 0.11,
    strokeWidth: 0.1,
    elements: 5,
    display: 3210,
    elementSpacing: 4,
    elementPadding: 2
  }
);

var dnsTable =  grid.set(0, 6, 4, 3, contrib.table,
  { keys: true
  , fg: 'white'
  , label: 'DNS entries in namespace'
  , interactive: false
  , columnSpacing: 1
  , columnWidth: [10, 3] });

var transactionsLine = grid.set(4, 9, 4, 3, contrib.line,
          { showNthLabel: 5
          , maxY: 100
          , label: 'Total Transactions'
          , showLegend: true
          , legend: {width: 10}})

const makeLog = () => {
  return grid.set(8, 0, 4, 12, contrib.log,
    { fg: "white"
    , selectedFg: "green"
    , label: 'Logs for targeted pods (streaming)'});
}

var log = makeLog();

//dummy data
var servers = ['US1', 'US2', 'EU1', 'AU1', 'AS1', 'JP1']
var commands = ['grep', 'node', 'java', 'timer', '~/ls -l', 'netns', 'watchdog', 'gulp', 'tar -xvf', 'awk', 'npm install']

var gauge_percent_two = 0
setInterval(function() {
  gauge_two.setData(gauge_percent_two);
  gauge_percent_two++;
  if (gauge_percent_two>=100) gauge_percent_two = 0
}, 200);

servicesTable.focus()

//set line charts dummy data

var transactionsData = {
   title: 'USA',
   style: {line: 'red'},
   x: ['00:00', '00:05', '00:10', '00:15', '00:20', '00:30', '00:40', '00:50', '01:00', '01:10', '01:20', '01:30', '01:40', '01:50', '02:00', '02:10', '02:20', '02:30', '02:40', '02:50', '03:00', '03:10', '03:20', '03:30', '03:40', '03:50', '04:00', '04:10', '04:20', '04:30'],
   y: [0, 20, 40, 45, 45, 50, 55, 70, 65, 58, 50, 55, 60, 65, 70, 80, 70, 50, 40, 50, 60, 70, 82, 88, 89, 89, 89, 80, 72, 70]
}

var transactionsData1 = {
   title: 'Europe',
   style: {line: 'yellow'},
   x: ['00:00', '00:05', '00:10', '00:15', '00:20', '00:30', '00:40', '00:50', '01:00', '01:10', '01:20', '01:30', '01:40', '01:50', '02:00', '02:10', '02:20', '02:30', '02:40', '02:50', '03:00', '03:10', '03:20', '03:30', '03:40', '03:50', '04:00', '04:10', '04:20', '04:30'],
   y: [0, 5, 5, 10, 10, 15, 20, 30, 25, 30, 30, 20, 20, 30, 30, 20, 15, 15, 19, 25, 30, 25, 25, 20, 25, 30, 35, 35, 30, 30]
}

var latencyData = {
   x: ['t1', 't2', 't3', 't4'],
   y: [5, 1, 7, 5]
}

setLineData([transactionsData, transactionsData1], transactionsLine)

setInterval(function() {
   setLineData([transactionsData, transactionsData1], transactionsLine)
   screen.render()
}, 500)

setInterval(function(){
  var colors = ['green','magenta','cyan','red','blue'];
  var text = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  var value = Math.round(Math.random() * 100);
  lcdLineOne.setDisplay(value + text[value%12]);
  lcdLineOne.setOptions({
    color: colors[value%5],
    elementPadding: 4
  });
  screen.render()
}, 1500);

var pct = 0.00;

function setLineData(mockData: any, line: any) {
  for (var i=0; i<mockData.length; i++) {
    var last = mockData[i].y[mockData[i].y.length-1]
    mockData[i].y.shift()
    var num = Math.max(last + Math.round(Math.random()*10) - 5, 10)
    mockData[i].y.push(num)
  }

  line.setData(mockData)
}


screen.key(['escape', 'q', 'C-c'], function() {
  return process.exit(0);
});

// fixes https://github.com/yaronn/blessed-contrib/issues/10
screen.on('resize', function() {
  gauge_two.emit('attach');
  servicesTable.emit('attach');
  podsTable.emit('attach');
  dnsTable.emit('attach');
  lcdLineOne.emit('attach');
  transactionsLine.emit('attach');
  log.emit('attach');
});

screen.render()

// --------------------------------------------------------------------------
// Start server stream.
// --------------------------------------------------------------------------

export const stream = new query.Subject<api.Update>();
const summaries = new Map<string, ServiceSummary>();
let activeKey: string | null = null;
stream
  .forEach(update => {
    const key = `${update.service.metadata.namespace}/${update.service.metadata.name}`;
    if (api.isServiceUpdate(update)) {
      switch (update.eventType) {
        case "ADDED":
        case "MODIFIED":
          summaries.set(key, new ServiceSummary(update.service));
          break;
        default:
          summaries.delete(key);
      }
    } else if (api.isTargetedPodsUpdate(update)) {
      const summary = summaries.has(key)
        ? <ServiceSummary>summaries.get(key)
        : new ServiceSummary(update.service);
      summary.setPods(update.pods);
    } else if (api.isEndpointsUpdate(update)) {
      const summary = summaries.has(key)
        ? <ServiceSummary>summaries.get(key)
        : new ServiceSummary(update.service);
      summary.setEndpoints(update.endpoints);
    }

    // Main menu update.
    {
      const rows: string[][] = [];
      const mainMenuServiceSummaryData = [...summaries]
        .sort(([name1], [name2]) => name1.localeCompare(name2))
        .map(([name, svcSumm]) => {
          const externalIps =
            (svcSumm.service && svcSumm.service.spec && svcSumm.service.spec.externalIPs)
            ? svcSumm.service.spec.externalIPs
            : [];
          return [ name
          ,  svcSumm.service.spec.type
          , svcSumm.service.spec.clusterIP
          , externalIps.length == 0 ? "<none>" : `[${externalIps.join(",")}]` ]
        });

      servicesTable.setData(
      { headers: ['Service name', 'Type', 'Cluster IP', 'External IP']
      , data: mainMenuServiceSummaryData })
    }

    // Service menu update.
    {
      if (key == activeKey) {
        const summary = summaries.get(key);
        if (summary != null) {
          podsTable.setData(
          { headers: serviceTableHeader
          , data: summary.render() });
        }
      }
    }

    screen.render();
  })
  .catch(e => {
    if (currKtailSub != null) {
      currKtailSub.unsubscribe();
    }
    screen.destroy();
    console.log(e);

    // Exit with code 1, `screen` still has some stuff running that we don't
    // bother to clean up.
    process.exit(1);
  });
