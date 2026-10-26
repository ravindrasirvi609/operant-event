
'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
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

export function SpeakerAssignmentEditor({
  speakers,
  defaultAssignments,
  onSave,
}: SpeakerAssignmentEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
useEffect(() => {
  if (!saveSuccess) return;

  const timer = window.setTimeout(() => {
    setSaveSuccess(false);
  }, 3000);

  return () => window.clearTimeout(timer);
}, [saveSuccess]);

  const { register, control, handleSubmit } = useForm<{
    assignments: Assignment[];
  }>({
    defaultValues: {
      assignments: defaultAssignments,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'assignments',
  });

  async function onSubmit(values: { assignments: Assignment[] }) {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await onSave(values.assignments);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Could not save speaker assignments.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddSpeaker() {
    if (speakers.length === 0) return;

    append({
      speakerId: speakers[0].id,
      role: 'SPEAKER',
    });

    setSaveError(null);
    setSaveSuccess(false);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
    >
      {speakers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4">
          <p className="font-medium">No speakers available</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a speaker profile from the Speakers menu first. After that,
            return here to assign that person to this session.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-center"
            >
              <div className="space-y-1">
                <label
                  htmlFor={`session-speaker-${field.id}`}
                  className="text-sm font-medium"
                >
                  Speaker
                </label>

                <select
                  id={`session-speaker-${field.id}`}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  {...register(`assignments.${index}.speakerId`, {
                    required: 'Select a speaker.',
                  })}
                >
                  {speakers.map((speaker) => (
                    <option key={speaker.id} value={speaker.id}>
                      {speaker.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`session-role-${field.id}`}
                  className="text-sm font-medium"
                >
                  Role
                </label>

                <select
                  id={`session-role-${field.id}`}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  {...register(`assignments.${index}.role`)}
                >
                  {SPEAKER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:pt-6">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    remove(index);
                    setSaveSuccess(false);
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={speakers.length === 0 || isSaving}
          onClick={handleAddSpeaker}
        >
          + Add speaker
        </Button>

        <Button
          type="submit"
          size="sm"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save speakers'}
        </Button>
      </div>

      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      )}

      {saveSuccess && (
  <p
    role="status"
    className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700"
  >
    ✓ Speaker assignments saved successfully.
  </p>
)}
    </form>
  );
}
