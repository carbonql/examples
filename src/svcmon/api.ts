import {WatchEvent, k8s} from "@carbonql/carbonql";

// --------------------------------------------------------------------------
// Server API.
// --------------------------------------------------------------------------

export type UpdateKind = "ServiceUpdate" | "TargetedPodsUpdate" | "EndpointsUpdate";

export interface Update {
  readonly kind: UpdateKind;
  readonly service: k8s.IoK8sApiCoreV1Service;
}

export class ServiceUpdate implements Update {
  readonly kind: UpdateKind = "ServiceUpdate";
  constructor(
    public readonly eventType: "ADDED" | "MODIFIED" | "DELETED" ,
    public readonly service: k8s.IoK8sApiCoreV1Service,
  ) {}
}

export const isServiceUpdate = (u: Update): u is ServiceUpdate =>
  u.kind == "ServiceUpdate";

export class TargetedPodsUpdate implements Update {
  readonly kind: UpdateKind = "TargetedPodsUpdate";
  constructor(
    public readonly service: k8s.IoK8sApiCoreV1Service,
    public readonly update: WatchEvent<k8s.IoK8sApiCoreV1Pod>,
    public readonly pods: Map<string, k8s.IoK8sApiCoreV1Pod>,
  ) {}
}

export const isTargetedPodsUpdate = (u: Update): u is TargetedPodsUpdate =>
  u.kind == "TargetedPodsUpdate";

export class EndpointsUpdate implements Update {
  readonly kind: UpdateKind = "EndpointsUpdate";
  constructor(
    public readonly service: k8s.IoK8sApiCoreV1Service,
    public readonly endpoints: Map<string, k8s.IoK8sApiCoreV1EndpointPort[]>
  ) {}
}

export const isEndpointsUpdate = (u: Update): u is EndpointsUpdate =>
  u.kind == "EndpointsUpdate";
