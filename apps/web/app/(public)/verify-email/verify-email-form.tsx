'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Status = 'idle' | 'verifying' | 'success' | 'error';

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    fetch('/api/proxy/auth/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (cancelled) return;
        if (response.ok) {
          setStatus('success');
        } else {
          const body = await response.json().catch(() => ({ message: 'Verification failed.' }));
          setErrorMessage(body.message ?? 'Verification failed.');
          setStatus('error');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage('Something went wrong. Please try again.');
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-12 text-center">
      {status === 'idle' ? (
        <>
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a verification link to your email address. Click it to activate your account.
          </p>
        </>
      ) : null}
      {status === 'verifying' ? <p className="text-sm text-muted-foreground">Verifying your email…</p> : null}
      {status === 'success' ? (
        <>
          <h1 className="text-xl font-semibold">Email verified</h1>
          <p className="text-sm text-muted-foreground">Your email address has been verified.</p>
          <Button render={<Link href="/login" />}>Continue to log in</Button>
        </>
      ) : null}
      {status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
