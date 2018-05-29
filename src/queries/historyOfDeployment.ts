import {Client, query, transform} from "@carbonql/carbonql";
const jsondiff = require("jsondiffpatch");

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const history = c.apps.v1beta1.Deployment
  .list()
  .filter(d => d.metadata.name == "nginx")
  .flatMap(d =>
    transform.apps.v1beta1.deployment
      .getRevisionHistory(c, d)
      .takeLast(2)
      .toArray());

history.forEach(rollout => {
  jsondiff.console.log(jsondiff.diff(rollout[0], rollout[1]))
});
