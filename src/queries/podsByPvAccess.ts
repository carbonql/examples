import {Client, transform} from "@carbonql/carbonql";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const podsByClaim = c.core.v1.PersistentVolume
  .list()
  .filter(pv => pv.status.phase == "Bound")
  .flatMap(pv =>
    c.core.v1.Pod
      .list()
      .filter(pod =>
        pod.spec
          .volumes
          .filter(vol =>
            vol.persistentVolumeClaim &&
            vol.persistentVolumeClaim.claimName == pv.spec.claimRef.name)
          .length > 0)
      .toArray()
      .map(pods => {return {pv: pv, pods: pods}}));

// Print.
podsByClaim.forEach(({pv, pods}) => {
  console.log(pv.metadata.name);
  pods.forEach(pod => console.log(`  ${pod.metadata.namespace}/${pod.metadata.name}`));
});
