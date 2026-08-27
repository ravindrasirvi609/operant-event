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
import { SpeakerForm } from '@/components/program/speaker-form';
import { useDeleteSpeaker, useSpeakers, useUpdateSpeaker } from '@/hooks/use-speakers';
import type { Speaker } from '@/lib/program/types';

const speakerEditSchema = z.object({
  name: z.string().min(1, 'Enter a name.'),
  designation: z.string().optional(),
  institution: z.string().optional(),
  country: z.string().optional(),
  bio: z.string().optional(),
});

type SpeakerEditValues = z.infer<typeof speakerEditSchema>;

export function SpeakerRoster({ conferenceId }: { conferenceId: string }) {
  const speakersQuery = useSpeakers(conferenceId);
  const updateSpeaker = useUpdateSpeaker(conferenceId);
  const deleteSpeaker = useDeleteSpeaker(conferenceId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="max-w-2xl space-y-6">
      <AsyncBoundary query={speakersQuery} empty={<p className="text-sm text-muted-foreground">No speakers yet.</p>}>
        {(speakers) => (
          <>
            <ul className="divide-y rounded-lg border">
              {speakers.map((speaker) =>
                editingId === speaker.id ? (
                  <li key={speaker.id} className="p-3">
                    <SpeakerEditForm
                      speaker={speaker}
                      onSave={async (values) => {
                        await updateSpeaker.mutateAsync({ speakerId: speaker.id, input: values });
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <li key={speaker.id} className="flex items-start justify-between gap-2 p-3">
                    <div>
                      <p className="text-sm font-medium">{speaker.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[speaker.designation, speaker.institution, speaker.country].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(speaker.id)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeletingId(speaker.id)}>
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
              title="Remove this speaker?"
              description="This also clears them from any session's speaker roster and chair/co-chair assignment."
              confirmLabel="Remove"
              isConfirming={deleteSpeaker.isPending}
              onConfirm={async () => {
                if (deletingId) {
                  await deleteSpeaker.mutateAsync(deletingId);
                  setDeletingId(null);
                }
              }}
            />
          </>
        )}
      </AsyncBoundary>
      <SpeakerForm conferenceId={conferenceId} />
    </div>
  );
}

function SpeakerEditForm({
  speaker,
  onSave,
  onCancel,
}: {
  speaker: Speaker;
  onSave: (values: SpeakerEditValues) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SpeakerEditValues>({
    resolver: zodResolver(speakerEditSchema),
    defaultValues: {
      name: speaker.name,
      designation: speaker.designation ?? '',
      institution: speaker.institution ?? '',
      country: speaker.country ?? '',
      bio: speaker.bio ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3" noValidate>
      <FormField label="Name" htmlFor={`speaker-edit-name-${speaker.id}`} error={errors.name?.message}>
        <Input id={`speaker-edit-name-${speaker.id}`} {...register('name')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Designation" htmlFor={`speaker-edit-designation-${speaker.id}`}>
          <Input id={`speaker-edit-designation-${speaker.id}`} {...register('designation')} />
        </FormField>
        <FormField label="Institution" htmlFor={`speaker-edit-institution-${speaker.id}`}>
          <Input id={`speaker-edit-institution-${speaker.id}`} {...register('institution')} />
        </FormField>
      </div>
      <FormField label="Country" htmlFor={`speaker-edit-country-${speaker.id}`}>
        <Input id={`speaker-edit-country-${speaker.id}`} {...register('country')} />
      </FormField>
      <FormField label="Bio" htmlFor={`speaker-edit-bio-${speaker.id}`}>
        <Input id={`speaker-edit-bio-${speaker.id}`} {...register('bio')} />
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
