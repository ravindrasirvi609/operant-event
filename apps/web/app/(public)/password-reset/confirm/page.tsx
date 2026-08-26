import { Suspense } from 'react';
import { PasswordResetConfirmForm } from './password-reset-confirm-form';

export default function PasswordResetConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <PasswordResetConfirmForm />
    </Suspense>
  );
}
