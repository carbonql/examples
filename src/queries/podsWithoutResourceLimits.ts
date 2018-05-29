import {Client, query} from "@carbonql/carbonql";

//
// Retrieve pods running on a node where memory pressure is high.
//
const c = Client.fromFile(<string>process.env.KUBECONFIG);

const podsNoLimits = c.core.v1.Pod
  .list("default")
  .filter(pod => {
    return pod.spec
      .containers
      .filter(cont => Object.keys(cont.resources).length === 0)
      .length > 0;
  });

//
// Outputs a list of pod names with no limits. Something like:
//
//   nginx-6f8cf9fbc4-qnrhb
//   nginx2-687c5bbccd-rzjl5
//

podsNoLimits.subscribe(pod => {
  console.log(pod.metadata.name);
});
