import {Client} from "@carbonql/carbonql";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const noServiceAccounts = c.core.v1.Pod
  .list()
  .filter(pod =>
    pod.spec.serviceAccountName == null ||
    pod.spec.serviceAccountName == "default");

noServiceAccounts.forEach(pod => console.log(pod.metadata.name));
