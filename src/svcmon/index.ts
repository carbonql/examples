#!/usr/bin/env node

import {Client, WatchEvent, transform, syncQuery, query, k8s} from "@carbonql/carbonql";
import * as api from "./api";
import * as server from "./screenServer";

// --------------------------------------------------------------------------
// Application logic.
// --------------------------------------------------------------------------

const namespace = "default";
const name = "nginx";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
c.core.v1.Service
  .watch(namespace)
  // .filter(update => update.object.metadata.name == name)
  .do(({type, object: service}) =>
    server.stream.next(new api.ServiceUpdate(type, service)))
  .flatMap(({object: service}) => {
    // Find pods that the service targets.
    return transform.core.v1.service
      .watchTargetedPods(c, service)
      .switchMap(update => query.Observable.of({service, ...update}))
      .do(({service, currentPodUpdate, pods}) =>
        server.stream.next(new api.TargetedPodsUpdate(service, currentPodUpdate, pods)))
  })
  .flatMap(({service}) => {
    // Verify that service endpoint objects were created and target the pods.
    return transform.core.v1.service
      .watchEndpointsByPod(c, service)
      .switchMap(({endpoints}) => query.Observable.of({service, endpoints}))
      .do(({endpoints}) => server.stream.next(new api.EndpointsUpdate(service, endpoints)))
  })
  // Evaluate container status for each pod.
  // Find DNS settings.
  .forEach(_ => {})
  .catch(e => {
    server.stream.error(e);
    return query.Observable.empty();
  });
