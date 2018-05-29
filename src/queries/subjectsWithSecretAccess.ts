import {Client, transform} from "@carbonql/carbonql";
const rbac = transform.rbacAuthorization;

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const subjectsWithSecretAccess = c.rbacAuthorization.v1beta1.Role
  .list()
  // Find Roles that apply to `core.v1.Secret`. Note the empty string denotes
  // the `core` namespace.
  .filter(role => rbac.v1beta1.role.appliesTo(role, "", "secrets"))
  .flatMap(role => {
    return c.rbacAuthorization.v1beta1.RoleBinding
      .list()
      // Find RoleBindings that apply to `role`. Project to a list of subjects
      // (e.g., Users) `role` is bound to.
      .filter(binding =>
        rbac.v1beta1.roleBinding.referencesRole(binding, role.metadata.name))
      .flatMap(binding => binding.subjects)
  });

// Print subjects.
subjectsWithSecretAccess.forEach(subj => console.log(`${subj.kind}\t${subj.name}`));
