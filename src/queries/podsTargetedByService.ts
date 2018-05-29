import {Client, query, transform} from "@carbonql/carbonql";

//
// Create a list of services and the pods they target.
//

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const servicesAndPods = c.core.v1.Service
  .list("default")
  .flatMap(service =>
    transform.core.v1.service
      .listTargetedPods(c, service)
      .flatMap(pods => {
        return [{
          service: service,
          pods: pods,
        }];
      }));

//
// Outputs a list of services and the pods they target. Something like:
//
//   Service 'nginx' -> [nginx2-687c5bbccd-rzjl5]
//

servicesAndPods.forEach(({service, pods}) => {
  const podNames = pods
    .map(pod => pod.metadata.name)
    .join(", ")
  console.log(`Service '${service.metadata.name}' -> [${podNames}]`)
});
