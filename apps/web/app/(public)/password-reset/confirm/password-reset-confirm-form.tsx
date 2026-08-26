'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

// Mirrors apps/api/src/auth/dto/confirm-password-reset.dto.ts.
const confirmSchema = z.object({
  newPassword: z.string().min(10, 'Password must be at least 10 characters.'),
});

type ConfirmValues = z.infer<typeof confirmSchema>;

export function PasswordResetConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmValues>({ resolver: zodResolver(confirmSchema) });

  async function onSubmit(values: ConfirmValues) {
    if (!token) {
      setSubmitError('This reset link is missing its token. Request a new one.');
      return;
    }
    setSubmitError(null);
    const response = await fetch('/api/proxy/auth/password-reset/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, newPassword: values.newPassword }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: 'Reset failed.' }));
      setSubmitError(body.message ?? 'Reset failed.');
      return;
    }
    router.push('/login');
  }

  if (!token) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">Invalid reset link</h1>
        <p className="text-sm text-muted-foreground">This link is missing its token.</p>
        <Link href="/password-reset" className="text-sm underline underline-offset-4">
          Request a new one
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="New password" htmlFor="newPassword" error={errors.newPassword?.message}>
          <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
        </FormField>
        {submitError ? (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </div>
  );
}
