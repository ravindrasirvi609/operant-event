'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CertificateStatusBadge } from '@/components/certificates/certificate-status-badge';
import { useGenerateCertificates, useIssueCertificate } from '@/hooks/use-certificates';
import type { Certificate } from '@/lib/certificates/types';

/**
 * `generate` runs the full eligibility sweep synchronously and returns
 * only the newly-created ELIGIBLE rows from this call — not every
 * certificate for the conference. Large-conference performance is a
 * backend/worker concern (see docs/plans/worker/05-certificate-pdf.md),
 * not something this panel can fix client-side.
 */
export function CertificateGenerationPanel({ conferenceId }: { conferenceId: string }) {
  const generate = useGenerateCertificates(conferenceId);
  const issue = useIssueCertificate(conferenceId);
  const [generated, setGenerated] = useState<Certificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    try {
      const result = await generate.mutateAsync();
      setGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate certificates.');
    }
  }

  async function handleIssue(certificateId: string) {
    setError(null);
    try {
      const updated = await issue.mutateAsync(certificateId);
      setGenerated((current) => current?.map((cert) => (cert.id === updated.id ? updated : cert)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue certificate.');
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Button disabled={generate.isPending} onClick={handleGenerate}>
        {generate.isPending ? 'Generating…' : 'Generate certificates'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {generated ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{generated.length} newly eligible.</p>
          <ul className="divide-y rounded-lg border">
            {generated.map((certificate) => (
              <li key={certificate.id} className="flex items-center justify-between p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span>{certificate.certificateNumber}</span>
                  <span className="text-muted-foreground">{certificate.certificateType}</span>
                  <CertificateStatusBadge status={certificate.status} />
                </div>
                {certificate.status === 'ELIGIBLE' ? (
                  <Button size="sm" disabled={issue.isPending} onClick={() => handleIssue(certificate.id)}>
                    Issue
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
