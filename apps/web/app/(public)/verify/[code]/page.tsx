'use client';

import { use } from 'react';
import { PublicVerificationCard } from '@/components/certificates/public-verification-card';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useVerifyCertificate } from '@/hooks/use-certificates';

export default function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const verificationQuery = useVerifyCertificate(code);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      {verificationQuery.isError ? (
        <p className="text-sm text-muted-foreground">
          Certificate not found — the code may be wrong, or the certificate hasn&apos;t been issued yet.
        </p>
      ) : (
        <AsyncBoundary query={verificationQuery}>
          {(verification) => <PublicVerificationCard verification={verification} />}
        </AsyncBoundary>
      )}
    </div>
  );
}
