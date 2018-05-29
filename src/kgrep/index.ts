#!/usr/bin/env node

import {Client, query, k8s} from "@carbonql/carbonql";
import * as chalk from "chalk";
import * as minimist from "minimist";

// --------------------------------------------------------------------------
// kgrep, a Kubernetes-native, optionally-streaming version of `grep`.
//
// kgrep makes it easy to search logs across a an arbitrary number of pods, all
// at once. Users provide the grep regex, which we use to search logs, and a pod
// regex, which is used to decide which pods to search.
//
// In streaming mode, we will continuously search the specified pods for the
// regex, constantly providing new results as the logs are populated.
// --------------------------------------------------------------------------

const usage = `Usage: kgrep <log-regex> [pod-regex] [--stream] [--all-namespaces]`;

const argv = minimist(process.argv.slice(2));
if (argv.length < 1) {
  console.log(usage);
  process.exit(1);
}

Object.keys(argv).forEach(k => {
  if (k != "_" && k != "stream" && k != "all-namespaces") {
    console.log(`Unrecognized flag '${k}'`);
    console.log(usage)
    process.exit(1);
  }
});

const stream = argv.stream != null;

const logRegex = RegExp(argv._[0], "g");
let podRegex: RegExp = RegExp(".+", "g");
if (argv._.length > 1) {
  podRegex = RegExp(argv._[1], "g");
}

// --------------------------------------------------------------------------
// Helpers.
// --------------------------------------------------------------------------

const filterAndColorize = (lines: string[]): string[][] => {
  const filtered = [];
  for (const line of lines) {
    let slices = [];
    let match = null;
    let lastIndex = 0;
    let foundMatch = false;
    while ((match = logRegex.exec(line)) !== null) {
      slices.push(line.slice(lastIndex, match.index));
      slices.push(
        chalk.default.red(
          line.slice(match.index, match.index + match[0].length)))
      lastIndex = match.index + match[0].length;
      foundMatch = true;
    }

    if (foundMatch) {
      slices.push(line.slice(lastIndex));
      filtered.push(slices.join(""));
    }
  }
  return filtered.length > 0 ? [filtered] : [];
}

// --------------------------------------------------------------------------
// Get logs, grep.
// --------------------------------------------------------------------------

const c = Client.fromFile(<string>process.env.KUBECONFIG);

// Set namespace to retreive pods from.
const currNs = argv["all-namespaces"]
  ? undefined
  : c.kubeConfig.getCurrentContextObject().namespace || "default";

c.core.v1.Pod
  .list(currNs)
  .flatMap(pod => {
    // Ignore pod if it doesn't match the regex.
    if (!podRegex.test(pod.metadata.name)) return [];

    // Get a log stream if `--stream` was passed in, else just get the output of
    // the standard `logs` request.
    const logs =
      stream
      ? c.core.v1.Pod.logStream(pod.metadata.name, pod.metadata.namespace)
      : c.core.v1.Pod.logs(pod.metadata.name, pod.metadata.namespace);

    // For each log line, colorize the part that was matched by the regex.
    return logs
      .filter(logs => logs != null)
      .map(logs => logs.split(/\r?\n/))
      .flatMap(filterAndColorize)
      .map(lines => {return {pod: pod, logsLines: lines}})
  })
  .forEach(({pod, logsLines}) => {
    logsLines.forEach(line => {
      console.log(`${pod.metadata.name}: ${line}`)
    });
  });
