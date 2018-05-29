# CarbonQL examples

## Building

To get the code and its dependencies, run:

```sh
git clone git@github.com:carbonql/examples.git
cd examples
npm install
```

Then, to build, run:

```sh
npm run build
```

## Running examples

The repository is organized as a set of examples in the `src` directory:

```sh
src/
  queries/ # A bunch of sample queries. One per file.
  ktail/   # Sample app tail'ing logs from an arbitrary number of pods
  kgrep/   # Sample app grep'ing logs from an arbitrary number of pods
  svcmon/  # Sample terminal dashboard for debugging services
```

**After building**, you can run any example as you would a normal node.js
application. For example:

```sh
# Run a file containing a query.
node build/queries/certSignReqs.js

# Run an app that is identified with index.js
node build/ktail
node build/kgrep
```

## Examples directory

### Governance-related queries

* [Audit all Certificates, including status, user, and requested
  usages](https://github.com/carbonql/examples/blob/master/src/queries/certSignReqs.ts): Retrieve
  all CertificateSigningRequests in all namespaces. Group them by status (i.e., "Pending",
  "Approved" or "Denied"), and then for each, report (1) the status of the request, (2) group
  information about the requesting user, and (3) the requested usages for the certificate.
* [Distinct versions of mysql container in
  cluster](https://github.com/carbonql/examples/blob/master/src/queries/distinctMySQLVersions.ts):
  Search all running Kubernetes Pods for containers that have the string "mysql" in their image
  name. Report only distinct image names.
* [List all Namespaces with no hard memory quota
  specified](https://github.com/carbonql/examples/blob/master/src/queries/namespacesWithNoQuota.ts):
  Retrieve all Kubernetes Namespaces. Filter this down to a set of namespaces for which there is
  either (1) no ResourceQuota governing resource use of that Namespace; or (2) a ResourceQuota that
  does not specify a hard memory limit.
* [Find Services publicly exposed to the
  Internet](https://github.com/carbonql/examples/blob/master/src/queries/servicesPubliclyExposed.ts):
  Kubernetes Services can expose a Pod to Internet traffic by setting the .spec.type to
  "LoadBalancer" (see documentation for ServiceSpec). Other Service types (such as "ClusterIP") are
  accessible only from inside the cluster. This query will find all Services whose type is
  "LoadBalancer", so they can be audited for access and cost (since a service with .spec.type set to
  "LoadBalancer" will typically cause the underlying cloud provider to boot up a dedicated load
  balancer).
* [Pods using the default
  ServiceAccount](https://github.com/carbonql/examples/blob/master/src/queries/podsUsingDefaultServiceAccount.ts):
  Retrieve all Pods, filtering down to those that are using the "default" ServiceAccount.
* [Find users and ServiceAccounts with access to
  Secrets](https://github.com/carbonql/examples/blob/master/src/queries/subjectsWithSecretAccess.ts):
  Retrieve all CertificateSigningRequests in all namespaces. Group them by status (i.e., "Pending",
  "Approved" or "Denied"), and then for each, report (1) the status of the request, (2) group
  information about the requesting user, and (3) the requested usages for the certificate.
* [Aggregate high-level report on resource consumption in a
  Namespace](https://github.com/carbonql/examples/blob/master/src/queries/aggregateReportOnNamespace.ts):
  For each Namespace, aggregate a rough overview of resource consumption in that Namespace. This
  could be arbitrarily complex; here we simply aggregate a count of several critical resources in
  that Namespace.
* [List Pods and their ServiceAccount (possibly a unique user) by Secrets they
  use](https://github.com/carbonql/examples/blob/master/src/queries/podsBySecretAccess.ts): Obtain
  all Secrets. For each of these Secrets, obtain all Pods that use them. Here we print (1) the name
  of the Secret, (2) the list of Pods that use it, and (3) the ServiceAccount that the Pod runs as
  (oftentimes this is allocated to a single user).
* [List Pods grouped by PersistentVolumes they
  use](https://github.com/carbonql/examples/blob/master/src/queries/podsByPvAccess.ts): Obtain all
  "Bound" PersistentVolumes (PVs). Then, obtain all Pods that use those PVs. Finally, print a small
  report listing the PV and all Pods that reference it.

### Operations-related queries

* [Find all Pod logs containing
  "ERROR:"](https://github.com/carbonql/examples/blob/master/src/queries/logsGroupedByPod.ts):
  Retrieve all Pods in the "default" namespace, obtain their logs, and filter down to only the Pods
  whose logs contain the string "Error:". Return the logs grouped by Pod name.
* [Diff last two rollouts of an
  application](https://github.com/carbonql/examples/blob/master/src/queries/historyOfDeployment.ts):
  Search for a Deployment named "nginx", and obtain the last 2 revisions in its rollout history.
  Then use the jsondiffpatch library to diff these two revisions. NOTE: a history of rollouts is not
  retained by default, so you'll need to create the deployment with .spec.revisionHistoryLimit set
  to a number larger than 2. (See documentation for DeploymentSpec)
* [Find all Pods scheduled on nodes with high memory
  pressure](https://github.com/carbonql/examples/blob/master/src/queries/podsOnNodesWithHighMemoryPressure.ts):
  Search for all Kubernetes Pods scheduled on nodes where status conditions report high memory
  pressure.
* [Aggregate cluster-wide error and warning Events into a
  report](https://github.com/carbonql/examples/blob/master/src/queries/findErrorEvevnts.ts): Search
  for all Kubernetes Events that are classified as "Warning" or "Error", and report them grouped by
  the type of Kubernetes object that caused them. In this example, there are warnings being emitted
  from both Nodes and from [Pods][pods], so we group them together by their place of origin.
