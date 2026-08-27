'use client';

import { use } from 'react';
import { CertificateGenerationPanel } from '@/components/certificates/certificate-generation-panel';

export default function CertificatesPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Certificates</h2>
      <CertificateGenerationPanel conferenceId={conferenceId} />
    </div>
  );
}
