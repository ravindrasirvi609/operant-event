import { CertificateStatusBadge } from '@/components/certificates/certificate-status-badge';
import { FileDownloadLink } from '@/components/files/file-download-link';
import type { Certificate } from '@/lib/certificates/types';

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
        <FileDownloadLink fileId={certificate.fileId} label="Download certificate PDF" />
      ) : (
        <p className="text-xs text-muted-foreground">Certificate issued, document pending.</p>
      )}
    </div>
  );
}
