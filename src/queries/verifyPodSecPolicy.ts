import {query, Client, transform, k8s} from "@carbonql/carbonql";
import * as chalk from "chalk";

function logError(pod: k8s.IoK8sApiCoreV1Pod, err: string) {
  console.log(`${chalk.default.green(pod.metadata.name)}: ${err}`);
}

//
// Helper functions that print information about non-compliant pods.
//

function usesUnsupportedVolumeTypes(pod: k8s.IoK8sApiCoreV1Pod): void {
  // Allow only the core volume types. NOTE: hostPath is not included in the list.
  const disallowedVols = pod.spec.volumes.filter(volume =>
    volume["configMap"] == null &&
    volume["emptyDir"] == null &&
    volume["projected"] == null &&
    volume["secret"] == null &&
    volume["downwardAPI"] == null &&
    volume["persistentVolumeClaim"] == null);
  if (disallowedVols.length > 0) { logError(pod, "uses unsupported volume type"); }
}

function uncompliantSecurityContext(pod: k8s.IoK8sApiCoreV1Pod): void {
  const podRunAsNonRoot =
    pod.spec.securityContext.runAsNonRoot == false ||
    pod.spec.securityContext.runAsNonRoot == null;

  // Check container security.
  pod.spec.containers.forEach(container => {
    const secCtx: k8s.IoK8sApiCoreV1SecurityContext = container.securityContext != null
      ? container.securityContext
      : <any>{};
    if (
      !(podRunAsNonRoot ||
        secCtx.runAsNonRoot == false ||
        secCtx.runAsNonRoot == null))             { logError(pod, "has container that does not require running as non-root"); }
    if (secCtx.allowPrivilegeEscalation == true)  { logError(pod, "has container that requires privilege escalation"); }
    // Block manipulation of network stack and access to devices
    if (secCtx.privileged == true)                { logError(pod, "has container that requires privileges to run"); }
    if (
      secCtx.capabilities == null ||
      secCtx.capabilities.drop == null ||
      secCtx.capabilities.drop
        .filter(cap => cap == "ALL").length == 0) { logError(pod, "has container that does not drop all capabilities"); }
    // No writable layer in a container. Must mount a volume to write anything.
    if (
      secCtx.readOnlyRootFilesystem == null ||
      secCtx.readOnlyRootFilesystem == false)    { logError(pod, "has container that does not require read-only root FS"); }
  });

  // Check pod security.
  const secCtx: k8s.IoK8sApiCoreV1PodSecurityContext = pod.spec.securityContext != null
    ? pod.spec.securityContext
    : <any>{};
  // Forbid adding the root group to the container.
  if (
    secCtx.supplementalGroups != null &&
    secCtx.supplementalGroups
      .filter(g => g == 0).length > 0) { logError(pod, "root is supplied as a group"); }
  if (
    secCtx.fsGroup != null &&
    secCtx.fsGroup == 0)               { logError(pod, "root is supplied as an FS group"); }
}

//
// Run the query.
//

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const pods = c.core.v1.Pod
  .list()
  .forEach(pod => {
    usesUnsupportedVolumeTypes(pod);
    uncompliantSecurityContext(pod);
    if (pod.spec.hostNetwork == true) { logError(pod, "uses host network"); }
    if (pod.spec.hostIPC == true)     { logError(pod, "uses host IPC"); }
    if (pod.spec.hostPID == true)     { logError(pod, "uses host PID"); }
  });
