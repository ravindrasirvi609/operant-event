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
  type UpdatePresentationInput,
} from '@/hooks/use-presentations';
import { validateSessionWindow } from '@/lib/program/validate-session-window';
import type { PresentationAssignment } from '@/lib/program/types';

const presentationEditSchema = z
  .object({
    presentationType: z.string().optional(),
    startTime: z.string().min(1, 'Choose a start time.'),
    endTime: z.string().min(1, 'Choose an end time.'),
    sortOrder: z.string().optional(),
  })
  .refine((values) => validateSessionWindow(values.startTime, values.endTime) === null, {
    message: 'End time must be after start time.',
    path: ['endTime'],
  });

type PresentationEditFormValues = z.infer<typeof presentationEditSchema>;

type PresentationRow = PresentationAssignment & { abstract: { title: string; submissionNumber: string | null } };

/** Real presentation list for the session — `GET sessions/:sessionId/presentations` — with edit/remove per row. */
export function PresentationList({ sessionId }: { sessionId: string }) {
  const presentationsQuery = usePresentations(sessionId);
  const updatePresentation = useUpdatePresentation(sessionId);
  const deletePresentation = useDeletePresentation(sessionId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <AsyncBoundary
      query={presentationsQuery}
      empty={<p className="text-sm text-muted-foreground">No presentations scheduled yet.</p>}
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
                    onSave={async (values) => {
                      setError(null);
                      const input: UpdatePresentationInput = {
                        presentationType: values.presentationType,
                        startTime: values.startTime,
                        endTime: values.endTime,
                        sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
                      };
                      try {
                        await updatePresentation.mutateAsync({ presentationId: presentation.id, input });
                        setEditingId(null);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to update presentation.');
                      }
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={presentation.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div>
                    <p>
                      {presentation.abstract.submissionNumber ?? presentation.abstract.title} —{' '}
                      {new Date(presentation.startTime).toLocaleTimeString()}–
                      {new Date(presentation.endTime).toLocaleTimeString()}
                      {presentation.presentationType ? ` · ${presentation.presentationType}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(presentation.id)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeletingId(presentation.id)}>
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
              if (deletingId) {
                await deletePresentation.mutateAsync(deletingId);
                setDeletingId(null);
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
  onSave,
  onCancel,
}: {
  presentation: PresentationRow;
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
      presentationType: presentation.presentationType ?? '',
      startTime: presentation.startTime.slice(0, 16),
      endTime: presentation.endTime.slice(0, 16),
      sortOrder: String(presentation.sortOrder),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start" htmlFor={`presentation-edit-start-${presentation.id}`} error={errors.startTime?.message}>
          <Input id={`presentation-edit-start-${presentation.id}`} type="datetime-local" {...register('startTime')} />
        </FormField>
        <FormField label="End" htmlFor={`presentation-edit-end-${presentation.id}`} error={errors.endTime?.message}>
          <Input id={`presentation-edit-end-${presentation.id}`} type="datetime-local" {...register('endTime')} />
        </FormField>
      </div>
      <FormField label="Presentation type" htmlFor={`presentation-edit-type-${presentation.id}`}>
        <Input id={`presentation-edit-type-${presentation.id}`} {...register('presentationType')} placeholder="e.g. Oral, Poster" />
      </FormField>
      <FormField label="Sort order" htmlFor={`presentation-edit-sort-${presentation.id}`}>
        <Input id={`presentation-edit-sort-${presentation.id}`} type="number" min={0} {...register('sortOrder')} />
      </FormField>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
