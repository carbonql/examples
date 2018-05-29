import {Client, transform} from "@carbonql/carbonql";
const certificates = transform.certificates;

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const csrs = c.certificates.v1beta1.CertificateSigningRequest
  .list()
  .map(csr => {
    // Get status of the CSR.
    return {
      status: certificates.v1beta1.certificateSigningRequest.getStatus(csr),
      request: csr,
    };
  })
  // Group CSRs by type (one of: `"Approved"`, `"Pending"`, or `"Denied"`).
  .groupBy(csr => csr.status.type);

csrs.forEach(csrs => {
  console.log(csrs.key);
  csrs.forEach(({request}) => {
    const usages = request.spec.usages.sort().join(", ");
    const groups = request.spec.groups.sort().join(", ");
    console.log(`\t${request.spec.username}\t[${usages}]\t[${groups}]`);
  });
});
