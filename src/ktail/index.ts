#!/usr/bin/env node

import {Client, query, k8s} from "@carbonql/carbonql";
import * as chalk from "chalk";
import * as minimist from "minimist";

// --------------------------------------------------------------------------
// ktail, a Kubernetes-native, optionally-streaming version of `tail`.
//
// ktail makes it easy to tail logs across a an arbitrary number of pods, all at
// once. Users provide a pod regex, which is used to decide which pods to
// `tail`.
//
// In streaming mode, we will continuously tail the specified pod logs,
// constantly outputting the results to console. Output of each pod logs are
// batched into windows of 1 second to make the resulting groups of log output
// somewhat contiguous.
// --------------------------------------------------------------------------

const usage = `Usage: ktail [pod-regex] [--stream] --all-namespaces`

const argv = minimist(process.argv.slice(2));
const stream = argv.stream != null;

Object.keys(argv).forEach(k => {
  if (k != "_" && k != "stream" && k != "all-namespaces") {
    console.log(`Unrecognized flag '${k}'`);
    console.log(usage)
    process.exit(1);
  }
});

let podRegex: RegExp = RegExp(".+", "g");
if (argv._.length > 0) {
  podRegex = RegExp(argv._[0], "g");
}

// --------------------------------------------------------------------------
// Get logs, tail.
// --------------------------------------------------------------------------

const c = Client.fromFile(<string>process.env.KUBECONFIG);

// Set namespace to retreive pods from.
const currNs = argv["all-namespaces"]
  ? undefined
  : c.kubeConfig.getCurrentContextObject().namespace || "default";

export const ktail = (
  ns: string | undefined, podRegex: RegExp, stream: boolean,
): query.Observable<{
  name: string;
  logs: string[];
}> => {
  return c.core.v1.Pod
    .list(ns)
    .flatMap(pod => {
      // Ignore pod if it doesn't match the regex.
      if (!podRegex.test(pod.metadata.name)) return [];

      // Get a log stream if `--stream` was passed in, else just get the output of
      // the standard `logs` request.
      const logs =
        stream
        ? c.core.v1.Pod.logStream(pod.metadata.name, pod.metadata.namespace)
        : c.core.v1.Pod.logs(pod.metadata.name, pod.metadata.namespace);

      // For each particular stream of logs, emit output in windowed intervals of
      // 1 second. This makes the logs slightly more contiguous, so that a bunch
      // of logs from one pod end up output together.
      return logs
        .filter(logs => logs != null)
        .window(query.Observable.timer(0, 1000))
        .flatMap(window =>
          window
            .toArray()
            .flatMap(logs => logs.length == 0 ? [] : [logs]))
        .map(logs => {return {name: pod.metadata.name, logs}});
    });
}

// Run query if this module is used as an executable (rather than a library).
if (require.main === module) {
  ktail(currNs, podRegex, stream)
    .forEach(({name, logs}) => {
      console.log(`${chalk.default.green(name)}:`);
      logs.forEach(line => console.log(`${line}`))
    });
}
