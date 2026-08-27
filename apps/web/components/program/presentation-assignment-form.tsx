'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useOrganizerAbstracts } from '@/hooks/use-organizer-abstracts';
import { useAssignPresentation } from '@/hooks/use-presentations';
import { validateSessionWindow } from '@/lib/program/validate-session-window';

const presentationSchema = z
  .object({
    abstractId: z.string().min(1, 'Select an abstract.'),
    presentationType: z.string().optional(),
    startTime: z.string().min(1, 'Choose a start time.'),
    endTime: z.string().min(1, 'Choose an end time.'),
  })
  .refine((values) => validateSessionWindow(values.startTime, values.endTime) === null, {
    message: 'End time must be after start time.',
    path: ['endTime'],
  });

type PresentationValues = z.infer<typeof presentationSchema>;

/**
 * Only lists ACCEPTED abstracts client-side, matching the backend's own
 * hard requirement (400 otherwise) — but the window-inside-session (400)
 * and no-double-booking (409) checks are NOT duplicated here, only
 * `endTime > startTime`; a real conflict still surfaces as the
 * backend's own error message.
 */
export function PresentationAssignmentForm({ conferenceId, sessionId }: { conferenceId: string; sessionId: string }) {
  const abstractsQuery = useOrganizerAbstracts(conferenceId);
  const assignPresentation = useAssignPresentation(conferenceId, sessionId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assigned, setAssigned] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PresentationValues>({ resolver: zodResolver(presentationSchema) });

  const acceptedAbstracts = (abstractsQuery.data ?? []).filter((abstract) => abstract.status === 'ACCEPTED');

  async function onSubmit(values: PresentationValues) {
    setSubmitError(null);
    setAssigned(false);
    try {
      await assignPresentation.mutateAsync(values);
      setAssigned(true);
      reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to assign presentation.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-3 border-t pt-4" noValidate>
      <h3 className="text-sm font-semibold">Schedule a presentation</h3>
      <FormField label="Abstract" htmlFor="presentation-abstract-id" error={errors.abstractId?.message}>
        <select
          id="presentation-abstract-id"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          {...register('abstractId')}
        >
          <option value="">Select an accepted abstract…</option>
          {acceptedAbstracts.map((abstract) => (
            <option key={abstract.id} value={abstract.id}>
              {abstract.submissionNumber ?? abstract.title}
            </option>
          ))}
        </select>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start" htmlFor="presentation-start" error={errors.startTime?.message}>
          <Input id="presentation-start" type="datetime-local" {...register('startTime')} />
        </FormField>
        <FormField label="End" htmlFor="presentation-end" error={errors.endTime?.message}>
          <Input id="presentation-end" type="datetime-local" {...register('endTime')} />
        </FormField>
      </div>
      <FormField label="Presentation type (optional)" htmlFor="presentation-type">
        <Input id="presentation-type" {...register('presentationType')} placeholder="e.g. Oral, Poster" />
      </FormField>
      {submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
      {assigned ? (
        <p role="status" className="text-sm text-muted-foreground">
          Scheduled.
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? 'Scheduling…' : 'Schedule presentation'}
      </Button>
    </form>
  );
}
