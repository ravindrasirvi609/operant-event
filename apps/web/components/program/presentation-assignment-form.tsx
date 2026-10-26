
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useOrganizerAbstracts } from '@/hooks/use-organizer-abstracts';
import { useSpeakers } from '@/hooks/use-speakers';
import { useAssignPresentation } from '@/hooks/use-presentations';
import { validateSessionWindow } from '@/lib/program/validate-session-window';

const presentationSchema = z
  .object({
    abstractId: z.string().optional(),
    title: z.string().optional(),
    speakerId: z.string().optional(),
    speakerName: z.string().optional(),
    speakerAffiliation: z.string().optional(),
    presentationType: z.string().optional(),
    startTime: z.string().min(1, 'Choose a start time.'),
    endTime: z.string().min(1, 'Choose an end time.'),
  })
  .refine(
    (values) =>
      Boolean(values.abstractId?.trim() || values.title?.trim()),
    {
      message: 'Select an abstract or enter a presentation title.',
      path: ['title'],
    },
  )
  .refine(
    (values) =>
      validateSessionWindow(values.startTime, values.endTime) === null,
    {
      message: 'End time must be after start time.',
      path: ['endTime'],
    },
  );

type PresentationValues = z.infer<typeof presentationSchema>;

export function PresentationAssignmentForm({
  conferenceId,
  sessionId,
}: {
  conferenceId: string;
  sessionId: string;
}) {
  const abstractsQuery = useOrganizerAbstracts(conferenceId);
  const speakersQuery = useSpeakers(conferenceId);
  const assignPresentation = useAssignPresentation(conferenceId, sessionId);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assigned, setAssigned] = useState(false);

  useEffect(() => {
    if (!assigned) return;

    const timeoutId = window.setTimeout(() => {
      setAssigned(false);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [assigned]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PresentationValues>({
    resolver: zodResolver(presentationSchema),
    defaultValues: {
      abstractId: '',
      title: '',
      speakerId: '',
      speakerName: '',
      speakerAffiliation: '',
      presentationType: '',
      startTime: '',
      endTime: '',
    },
  });

  const acceptedAbstracts = (abstractsQuery.data ?? []).filter(
    (abstract) => abstract.status === 'ACCEPTED',
  );

  const speakers = speakersQuery.data ?? [];

  async function onSubmit(values: PresentationValues) {
    setSubmitError(null);
    setAssigned(false);

    try {
      await assignPresentation.mutateAsync({
        ...values,
        abstractId: values.abstractId?.trim() || undefined,
        title: values.title?.trim() || undefined,
        speakerId: values.speakerId || null,
        speakerName: values.speakerName?.trim() || undefined,
        speakerAffiliation:
          values.speakerAffiliation?.trim() || undefined,
        presentationType: values.presentationType?.trim() || undefined,
      });

      setAssigned(true);
      reset();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to assign presentation.',
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-md space-y-3 border-t pt-4"
      noValidate
    >
      <h3 className="text-sm font-semibold">Schedule a presentation</h3>

      <FormField
        label="Abstract (optional)"
        htmlFor="presentation-abstract-id"
        error={errors.abstractId?.message}
      >
        <select
          id="presentation-abstract-id"
          className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          {...register('abstractId')}
        >
          <option value="">No abstract — add a free-form presentation</option>
          {acceptedAbstracts.map((abstract) => (
            <option key={abstract.id} value={abstract.id}>
              {abstract.submissionNumber
                ? `${abstract.submissionNumber} — ${abstract.title}`
                : abstract.title}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Presentation title"
        htmlFor="presentation-title"
        error={errors.title?.message}
      >
        <Input
          id="presentation-title"
          {...register('title')}
          className="h-10 text-sm placeholder:text-sm"
          placeholder="Enter the talk title"
        />
      </FormField>

      <FormField
        label="Existing presenter (optional)"
        htmlFor="presentation-speaker"
      >
        <select
          id="presentation-speaker"
          className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          {...register('speakerId')}
          disabled={speakersQuery.isLoading || speakers.length === 0}
        >
          <option value="">
            {speakersQuery.isLoading
              ? 'Loading presenters...'
              : speakers.length === 0
                ? 'No speakers added to this conference'
                : 'No existing presenter selected'}
          </option>

          {speakers.map((speaker) => (
            <option key={speaker.id} value={speaker.id}>
              {speaker.name}
              {speaker.designation ? ` — ${speaker.designation}` : ''}
              {speaker.institution ? `, ${speaker.institution}` : ''}
            </option>
          ))}
        </select>
      </FormField>

      {speakersQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load presenters. Please refresh and try again.
        </p>
      ) : null}

      <FormField
        label="Presenter name (manual, optional)"
        htmlFor="presentation-speaker-name"
      >
        <Input
          id="presentation-speaker-name"
          {...register('speakerName')}
          className="h-10 text-sm placeholder:text-sm"
          placeholder="Enter presenter name"
        />
      </FormField>

      <FormField
        label="Presenter affiliation (optional)"
        htmlFor="presentation-speaker-affiliation"
      >
        <Input
          id="presentation-speaker-affiliation"
          {...register('speakerAffiliation')}
          className="h-10 text-sm placeholder:text-sm"
          placeholder="University, institution or organization"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Start"
          htmlFor="presentation-start"
          error={errors.startTime?.message}
        >
          <Input
            id="presentation-start"
            type="datetime-local"
            className="text-sm"
            {...register('startTime')}
          />
        </FormField>

        <FormField
          label="End"
          htmlFor="presentation-end"
          error={errors.endTime?.message}
        >
          <Input
            id="presentation-end"
            type="datetime-local"
            className="text-sm"
            {...register('endTime')}
          />
        </FormField>
      </div>

      <FormField
        label="Presentation type (optional)"
        htmlFor="presentation-type"
      >
        <Input
          id="presentation-type"
          {...register('presentationType')}
          className="h-10 text-sm placeholder:text-sm"
          placeholder="e.g. Oral, Keynote, Invited Talk"
        />
      </FormField>

      {submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      {assigned ? (
        <p role="status" className="text-sm text-green-700">
          Presentation scheduled successfully.
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? 'Scheduling...' : 'Schedule presentation'}
      </Button>
    </form>
  );
}
