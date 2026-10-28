
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { AsyncBoundary } from '@/components/query/async-boundary';
import {
  useDeletePresentation,
  usePresentations,
  useUpdatePresentation,
  type PresentationWithDetails,
  type UpdatePresentationInput,
} from '@/hooks/use-presentations';
import { useSpeakers } from '@/hooks/use-speakers';
import { validateSessionWindow } from '@/lib/program/validate-session-window';
import type { Speaker } from '@/lib/program/types';

function toDateTimeLocal(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (part: number) => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const presentationEditSchema = z
  .object({
    title: z.string().optional(),
    speakerId: z.string().optional(),
    speakerName: z.string().optional(),
    speakerAffiliation: z.string().optional(),
    presentationType: z.string().optional(),
    startTime: z.string().min(1, 'Choose a start time.'),
    endTime: z.string().min(1, 'Choose an end time.'),
    sortOrder: z.string().optional(),
  })
  .refine(
    (values) =>
      validateSessionWindow(values.startTime, values.endTime) === null,
    {
      message: 'End time must be after start time.',
      path: ['endTime'],
    },
  );

type PresentationEditFormValues = z.infer<typeof presentationEditSchema>;

export function PresentationList({
  conferenceId,
  sessionId,
}: {
  conferenceId: string;
  sessionId: string;
}) {
  const presentationsQuery = usePresentations(sessionId);
  const speakersQuery = useSpeakers(conferenceId);
  const updatePresentation = useUpdatePresentation(sessionId);
  const deletePresentation = useDeletePresentation(sessionId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const speakers = speakersQuery.data ?? [];

  return (
    <AsyncBoundary
      query={presentationsQuery}
      empty={
        <p className="text-sm text-muted-foreground">
          No presentations scheduled yet.
        </p>
      }
    >
      {(presentations) => (
        <>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <ul className="space-y-2">
            {presentations.map((presentation) =>
              editingId === presentation.id ? (
                <li key={presentation.id} className="rounded-lg border p-3">
                  <PresentationEditForm
                    presentation={presentation}
                    speakers={speakers}
                    speakersLoading={speakersQuery.isLoading}
                    onSave={async (values) => {
                      setError(null);

                      const input: UpdatePresentationInput = {
                        title: values.title?.trim() || undefined,
                        speakerId: values.speakerId || null,
                        speakerName: values.speakerName?.trim() || null,
                        speakerAffiliation:
                          values.speakerAffiliation?.trim() || null,
                        presentationType:
                          values.presentationType?.trim() || undefined,
                        startTime: new Date(values.startTime).toISOString(),
                        endTime: new Date(values.endTime).toISOString(),
                        sortOrder: values.sortOrder?.trim()
                          ? Number(values.sortOrder)
                          : undefined,
                      };

                      try {
                        await updatePresentation.mutateAsync({
                          presentationId: presentation.id,
                          input,
                        });
                        setEditingId(null);
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : 'Failed to update presentation.',
                        );
                      }
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li
                  key={presentation.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    {presentation.abstract?.submissionNumber ? (
                      <>
                        <p className="font-medium">
                          {presentation.abstract.submissionNumber}
                        </p>
                        <p className="text-muted-foreground">
                          {presentation.abstract.title}
                        </p>
                      </>
                    ) : (
                      <p className="font-medium">
                        {presentation.title ??
                          presentation.abstract?.title ??
                          'Presentation title unavailable'}
                      </p>
                    )}

                    <p className="mt-1 text-muted-foreground">
                      {new Date(presentation.startTime).toLocaleTimeString(
                        [],
                        { hour: '2-digit', minute: '2-digit' },
                      )}
                      {' – '}
                      {new Date(presentation.endTime).toLocaleTimeString(
                        [],
                        { hour: '2-digit', minute: '2-digit' },
                      )}
                      {presentation.presentationType
                        ? ` · ${presentation.presentationType}`
                        : ''}
                    </p>

                    <p className="mt-1">
                      <span className="font-medium">Presenter: </span>
                      {presentation.speaker ? (
                        <>
                          {presentation.speaker.name}
                          {presentation.speaker.designation
                            ? ` — ${presentation.speaker.designation}`
                            : ''}
                          {presentation.speaker.institution
                            ? `, ${presentation.speaker.institution}`
                            : ''}
                        </>
                      ) : presentation.speakerName ? (
                        <>
                          {presentation.speakerName}
                          {presentation.speakerAffiliation
                            ? ` — ${presentation.speakerAffiliation}`
                            : ''}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Not assigned
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(presentation.id)}
                    >
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(presentation.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ),
            )}
          </ul>

          <ConfirmDialog
            open={deletingId !== null}
            onOpenChange={(open) => !open && setDeletingId(null)}
            title="Remove this presentation from the session?"
            confirmLabel="Remove"
            isConfirming={deletePresentation.isPending}
            onConfirm={async () => {
              if (!deletingId) return;

              try {
                setError(null);
                await deletePresentation.mutateAsync(deletingId);
                setDeletingId(null);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : 'Failed to remove presentation.',
                );
              }
            }}
          />
        </>
      )}
    </AsyncBoundary>
  );
}

function PresentationEditForm({
  presentation,
  speakers,
  speakersLoading,
  onSave,
  onCancel,
}: {
  presentation: PresentationWithDetails;
  speakers: Speaker[];
  speakersLoading: boolean;
  onSave: (values: PresentationEditFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PresentationEditFormValues>({
    resolver: zodResolver(presentationEditSchema),
    defaultValues: {
      title: presentation.title ?? presentation.abstract?.title ?? '',
      speakerId: presentation.speakerId ?? '',
      speakerName: presentation.speakerName ?? '',
      speakerAffiliation: presentation.speakerAffiliation ?? '',
      presentationType: presentation.presentationType ?? '',
      startTime: toDateTimeLocal(presentation.startTime),
      endTime: toDateTimeLocal(presentation.endTime),
      sortOrder: String(presentation.sortOrder),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3" noValidate>
      <FormField
        label="Presentation title"
        htmlFor={`presentation-edit-title-${presentation.id}`}
      >
        <Input
          id={`presentation-edit-title-${presentation.id}`}
          {...register('title')}
          className="text-sm"
          placeholder="Enter presentation title"
        />
      </FormField>

      <FormField
        label="Existing presenter"
        htmlFor={`presentation-edit-speaker-${presentation.id}`}
      >
        <select
          id={`presentation-edit-speaker-${presentation.id}`}
          className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          {...register('speakerId')}
          disabled={speakersLoading}
        >
          <option value="">
            {speakersLoading ? 'Loading presenters...' : 'No existing presenter selected'}
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

      <FormField
        label="Presenter name (manual)"
        htmlFor={`presentation-edit-speaker-name-${presentation.id}`}
      >
        <Input
          id={`presentation-edit-speaker-name-${presentation.id}`}
          {...register('speakerName')}
          className="text-sm"
          placeholder="Enter presenter name"
        />
      </FormField>

      <FormField
        label="Presenter affiliation"
        htmlFor={`presentation-edit-affiliation-${presentation.id}`}
      >
        <Input
          id={`presentation-edit-affiliation-${presentation.id}`}
          {...register('speakerAffiliation')}
          className="text-sm"
          placeholder="University or organization"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Start"
          htmlFor={`presentation-edit-start-${presentation.id}`}
          error={errors.startTime?.message}
        >
          <Input
            id={`presentation-edit-start-${presentation.id}`}
            type="datetime-local"
            className="text-sm"
            {...register('startTime')}
          />
        </FormField>

        <FormField
          label="End"
          htmlFor={`presentation-edit-end-${presentation.id}`}
          error={errors.endTime?.message}
        >
          <Input
            id={`presentation-edit-end-${presentation.id}`}
            type="datetime-local"
            className="text-sm"
            {...register('endTime')}
          />
        </FormField>
      </div>

      <FormField
        label="Presentation type"
        htmlFor={`presentation-edit-type-${presentation.id}`}
      >
        <Input
          id={`presentation-edit-type-${presentation.id}`}
          {...register('presentationType')}
          className="text-sm"
          placeholder="e.g. Oral, Poster"
        />
      </FormField>

      <FormField
        label="Sort order"
        htmlFor={`presentation-edit-sort-${presentation.id}`}
      >
        <Input
          id={`presentation-edit-sort-${presentation.id}`}
          type="number"
          min={0}
          className="text-sm"
          {...register('sortOrder')}
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
