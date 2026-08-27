'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useAddReviewer } from '@/hooks/use-reviewers';

const addReviewerSchema = z.object({
  userId: z.string().min(1, 'Enter a user ID.'),
});

type AddReviewerValues = z.infer<typeof addReviewerSchema>;

/**
 * There is no email-based user lookup anywhere in the backend — `POST
 * reviewers` requires the exact internal user id. This is disclosed
 * directly here rather than pretending an email field would work.
 */
export function AddReviewerForm({ organizationId }: { organizationId: string }) {
  const addReviewer = useAddReviewer(organizationId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddReviewerValues>({ resolver: zodResolver(addReviewerSchema) });

  async function onSubmit(values: AddReviewerValues) {
    setSubmitError(null);
    try {
      await addReviewer.mutateAsync(values.userId);
      reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to add reviewer.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-3" noValidate>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
        There is no email-based lookup yet — the backend requires the exact internal user ID. Find it from
        wherever the person&apos;s account was created (e.g. the organization member invite flow) until a real
        lookup endpoint exists.
      </div>
      <FormField label="User ID" htmlFor="reviewer-user-id" error={errors.userId?.message}>
        <Input id="reviewer-user-id" {...register('userId')} />
      </FormField>
      {submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add reviewer'}
      </Button>
    </form>
  );
}
