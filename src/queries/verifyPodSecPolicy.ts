import {query, Client, transform, k8s} from "@carbonql/carbonql";
import * as chalk from "chalk";

//
// Helper functions that print information about non-compliant pods.
//
function logError(cond: boolean, pod: k8s.IoK8sApiCoreV1Pod, err: string) {
  if (cond) { 
    const podName = chalk.default.green(pod.metadata.name)
    const podNamespace = chalk.default.yellow(pod.metadata.namespace)
    console.log(`Pod [${podName}] in namespace [${podNamespace}] ${chalk.default.red(err)}`); }
}

function reportUnsupportedVolumeTypes(pod: k8s.IoK8sApiCoreV1Pod): void {
  // Allow only the core volume types. NOTE: hostPath is not included in the list.
  const disallowedVols = (pod.spec.volumes == null ? [] : pod.spec.volumes).filter(volume =>
    volume["configMap"] == null &&
    volume["emptyDir"] == null &&
    volume["projected"] == null &&
    volume["secret"] == null &&
    volume["downwardAPI"] == null &&
    volume["persistentVolumeClaim"] == null);

  logError(disallowedVols.length > 0, pod, `uses unsupported volume type for volumes [${disallowedVols.map(a => a.name)}]`);
}

function reportUncompliantSecurityContext(pod: k8s.IoK8sApiCoreV1Pod): void {
  const podRunAsNonRoot =
    pod.spec.securityContext.runAsNonRoot == false ||
    pod.spec.securityContext.runAsNonRoot == null;

  // Check container security.
  pod.spec.containers.forEach(container => {
    const secCtx: k8s.IoK8sApiCoreV1SecurityContext = container.securityContext != null
      ? container.securityContext
      : <any>{};
    logError(
      !(podRunAsNonRoot ||
        secCtx.runAsNonRoot == false ||
        secCtx.runAsNonRoot == null),                 pod, "has container that does not require running as non-root");
    logError(secCtx.allowPrivilegeEscalation == true, pod, "has container that requires privilege escalation");
    // Block manipulation of network stack and access to devices
    logError(secCtx.privileged == true,               pod, "has container that requires privileges to run");
    logError(
      secCtx.capabilities == null ||
      secCtx.capabilities.drop == null ||
      secCtx.capabilities.drop
        .filter(cap => cap == "ALL").length == 0,     pod, "has container that does not drop all capabilities");
    // No writable layer in a container. Must mount a volume to write anything.
    logError(
      secCtx.readOnlyRootFilesystem == null ||
      secCtx.readOnlyRootFilesystem == false,         pod, "has container that does not require read-only root FS");
  });

  // Check pod security.
  const secCtx: k8s.IoK8sApiCoreV1PodSecurityContext = pod.spec.securityContext != null
    ? pod.spec.securityContext
    : <any>{};
  // Forbid adding the root group to the container.
  logError(
    secCtx.supplementalGroups != null &&
    secCtx.supplementalGroups
      .filter(g => g == 0).length > 0, pod, "root is supplied as a group");
  logError(
    secCtx.fsGroup != null &&
    secCtx.fsGroup == 0,               pod, "root is supplied as an FS group");
}

//
// Run the query.
//

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const pods = c.core.v1.Pod
  .list()
  .forEach(pod => {
    reportUnsupportedVolumeTypes(pod);
    reportUncompliantSecurityContext(pod);
    logError(pod.spec.hostNetwork == true, pod, "uses host network");
    logError(pod.spec.hostIPC == true,     pod, "uses host IPC");
    logError(pod.spec.hostPID == true,     pod, "uses host PID");
  });
