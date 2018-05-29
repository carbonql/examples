import {Client, transform} from "@carbonql/carbonql";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const podsByClaim = c.core.v1.Secret
  .list()
  .flatMap(secret =>
    c.core.v1.Pod
      .list()
      .filter(pod =>
        pod.spec
          .volumes
          .filter(vol =>
            vol.secret &&
            vol.secret.secretName == secret.metadata.name)
          .length > 0)
      .toArray()
      .map(pods => {return {secret: secret, pods: pods}}));

// Print.
podsByClaim.forEach(({secret, pods}) => {
  console.log(secret.metadata.name);
  pods.forEach(pod => console.log(`  ${pod.spec.serviceAccountName} ${pod.metadata.namespace}/${pod.metadata.name}`));
});
