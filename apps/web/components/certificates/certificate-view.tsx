import { CertificateStatusBadge } from '@/components/certificates/certificate-status-badge';
import type { Certificate } from '@/lib/certificates/types';

/** `fileId` is always null today — PDF rendering is a backend-deferred item, same pattern as `<InvoiceView>` in Phase 4. */
export function CertificateView({ certificate }: { certificate: Certificate }) {
  return (
    <div className="max-w-sm space-y-3 rounded-lg border p-4 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{certificate.certificateNumber}</h3>
        <CertificateStatusBadge status={certificate.status} />
      </div>
      <dl className="grid grid-cols-2 gap-1">
        <dt className="text-muted-foreground">Type</dt>
        <dd>{certificate.certificateType}</dd>
        <dt className="text-muted-foreground">Issued</dt>
        <dd>{certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString() : 'Not yet issued'}</dd>
      </dl>
      {certificate.fileId ? (
        <p className="text-xs text-muted-foreground">PDF available.</p>
      ) : (
        <p className="text-xs text-muted-foreground">Certificate issued, document pending.</p>
      )}
    </div>
  );
}
