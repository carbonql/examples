import {Client, query} from "@carbonql/carbonql";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const mySqlVersions = c.core.v1.Pod
  .list("default")
  .flatMap(pod => pod.spec.containers)
  .map(container => container.image)
  .filter(imageName => imageName.includes("mysql"))
  .distinct();

mySqlVersions.forEach(console.log);
