import {Client, query} from "@carbonql/carbonql";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const loadBalancers = c.core.v1.Service
  .list()
  .filter(svc => svc.spec.type == "LoadBalancer");

// Print.
loadBalancers.forEach(
  svc => console.log(`${svc.metadata.namespace}/${svc.metadata.name}`));
