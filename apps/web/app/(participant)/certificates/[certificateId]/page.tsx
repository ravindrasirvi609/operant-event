'use client';

import { use } from 'react';
import { CertificateView } from '@/components/certificates/certificate-view';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useCertificate } from '@/hooks/use-certificates';

export default function MyCertificatePage({ params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = use(params);
  const certificateQuery = useCertificate(certificateId);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Certificate</h1>
      <AsyncBoundary query={certificateQuery}>{(certificate) => <CertificateView certificate={certificate} />}</AsyncBoundary>
    </div>
  );
}
