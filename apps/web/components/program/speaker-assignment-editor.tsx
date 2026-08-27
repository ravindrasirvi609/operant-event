'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SPEAKER_ROLES, type Speaker, type SpeakerRole } from '@/lib/program/types';

interface Assignment {
  speakerId: string;
  role: SpeakerRole;
}

interface SpeakerAssignmentEditorProps {
  speakers: Speaker[];
  defaultAssignments: Assignment[];
  onSave: (assignments: Assignment[]) => void | Promise<void>;
}

/** An empty array on save is a real, deliberate submission — it clears every speaker on the session, not a no-op. */
export function SpeakerAssignmentEditor({ speakers, defaultAssignments, onSave }: SpeakerAssignmentEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { register, control, handleSubmit } = useForm<{ assignments: Assignment[] }>({
    defaultValues: { assignments: defaultAssignments },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'assignments' });

  async function onSubmit(values: { assignments: Assignment[] }) {
    setIsSaving(true);
    try {
      await onSave(values.assignments);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-2">
          <select
            className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            {...register(`assignments.${index}.speakerId`)}
          >
            {speakers.map((speaker) => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.name}
              </option>
            ))}
          </select>
          <select
            className="h-8 w-36 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            {...register(`assignments.${index}.role`)}
          >
            {SPEAKER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <Button type="button" variant="ghost" size="sm" aria-label={`Remove row ${index + 1}`} onClick={() => remove(index)}>
            Remove
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={speakers.length === 0}
          onClick={() => append({ speakerId: speakers[0]?.id ?? '', role: 'SPEAKER' })}
        >
          Add speaker
        </Button>
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save speakers'}
        </Button>
      </div>
    </form>
  );
}
