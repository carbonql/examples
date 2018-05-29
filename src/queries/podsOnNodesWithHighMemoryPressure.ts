import {Client, query} from "@carbonql/carbonql";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const pressured = c.core.v1.Pod.list()
  // Index pods by node name.
  .groupBy(pod => pod.spec.nodeName)
  .flatMap(group => {
    // Join pods and nodes on node name; filter out everything where mem
    // pressure is not high.
    const nodes = c.core.v1.Node
      .list()
      .filter(node =>
        node.metadata.name == group.key &&
        node.status.conditions
          .filter(c => c.type === "MemoryPressure" && c.status === "True")
          .length >= 1);

    // Return join of {node, pods}
    return group
      .toArray()
      .flatMap(pods => nodes.map(node => {return {node, pods}}))
  })

pressured.forEach(({node, pods}) => {
  console.log(node.metadata.name);
  pods.forEach(pod => console.log(`    ${pod.metadata.name}`));
});
