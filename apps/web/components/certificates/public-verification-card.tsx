import { CertificateStatusBadge } from '@/components/certificates/certificate-status-badge';
import type { CertificateVerification } from '@/lib/certificates/types';

/**
 * Renders ONLY the 6 fields the backend's public verification response
 * actually carries — never add a link back to any authenticated
 * resource here; the entire point of this minimum-field response is
 * that anonymous verification never becomes a pivot into the real
 * registration/user record.
 */
export function PublicVerificationCard({ verification }: { verification: CertificateVerification }) {
  return (
    <div className="max-w-sm space-y-3 rounded-lg border p-6 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{verification.certificateNumber}</h2>
        <CertificateStatusBadge status={verification.status} />
      </div>
      <dl className="grid grid-cols-2 gap-1">
        <dt className="text-muted-foreground">Holder</dt>
        <dd>{verification.holderName}</dd>
        <dt className="text-muted-foreground">Conference</dt>
        <dd>{verification.conferenceName}</dd>
        <dt className="text-muted-foreground">Type</dt>
        <dd>{verification.certificateType}</dd>
        <dt className="text-muted-foreground">Issued</dt>
        <dd>{verification.issuedAt ? new Date(verification.issuedAt).toLocaleDateString() : '—'}</dd>
      </dl>
    </div>
  );
}
