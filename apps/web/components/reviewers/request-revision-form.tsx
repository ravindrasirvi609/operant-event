'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useRequestRevision } from '@/hooks/use-decisions';

const revisionSchema = z.object({
  reason: z.string().min(1, 'Enter a reason.'),
  dueDate: z.string().optional(),
});

type RevisionValues = z.infer<typeof revisionSchema>;

/** A genuinely separate operation from <DecisionForm> — the backend models AbstractRevisionRequest and AbstractDecision as distinct rows/triggers. */
export function RequestRevisionForm({ abstractId }: { abstractId: string }) {
  const requestRevision = useRequestRevision(abstractId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RevisionValues>({ resolver: zodResolver(revisionSchema) });

  async function onSubmit(values: RevisionValues) {
    setSubmitError(null);
    try {
      await requestRevision.mutateAsync(values);
      setRequested(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to request revision.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4" noValidate>
      <FormField label="Reason for revision" htmlFor="revision-reason" error={errors.reason?.message}>
        <Input id="revision-reason" {...register('reason')} />
      </FormField>
      <FormField label="Due date (optional)" htmlFor="revision-due-date">
        <Input id="revision-due-date" type="date" {...register('dueDate')} />
      </FormField>
      {submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
      {requested ? (
        <p role="status" className="text-sm text-muted-foreground">
          Revision requested.
        </p>
      ) : null}
      <Button type="submit" variant="outline" disabled={isSubmitting}>
        {isSubmitting ? 'Requesting…' : 'Request revision'}
      </Button>
    </form>
  );
}
