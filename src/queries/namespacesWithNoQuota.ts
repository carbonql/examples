import {Client} from "@carbonql/carbonql";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const noQuotas = c.core.v1.Namespace
  .list()
  .flatMap(ns =>
    c.core.v1.ResourceQuota
      .list(ns.metadata.name)
      // Retrieve only ResourceQuotas that (1) apply to this namespace, and (2)
      // specify hard limits on memory.
      .filter(rq => rq.spec.hard["limits.memory"] != null)
      .toArray()
      .flatMap(rqs => rqs.length == 0 ? [ns] : []));

// Print.
noQuotas.forEach(ns => console.log(ns.metadata.name));
