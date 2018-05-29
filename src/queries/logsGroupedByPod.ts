import {Client, transform} from "@carbonql/carbonql";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const podLogs = c.core.v1.Pod
  .list("default")
  // Retrieve logs for all pods, filter for logs with `ERROR:`.
  .flatMap(pod =>
    transform.core.v1.pod
      .getLogs(c, pod)
      .filter(({logs}) => logs.toLowerCase().includes("error:")));

podLogs.subscribe(({pod, logs}) => {
  // Print all the name of the pod and its logs.
  console.log(pod.metadata.name);
  console.log(logs);
});
