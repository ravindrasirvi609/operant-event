'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { validateSessionWindow } from '@/lib/program/validate-session-window';
import type { ProgramSession } from '@/lib/program/types';

const sessionSchema = z
  .object({
    title: z.string().min(1, 'Enter a session title.'),
    trackId: z.string().optional(),
    description: z.string().optional(),
    room: z.string().optional(),
    sessionType: z.string().optional(),
    sessionDate: z.string().min(1, 'Choose a date.'),
    startTime: z.string().min(1, 'Choose a start time.'),
    endTime: z.string().min(1, 'Choose an end time.'),
  })
  .refine((values) => validateSessionWindow(values.startTime, values.endTime) === null, {
    message: 'End time must be after start time.',
    path: ['endTime'],
  });

export type SessionFormValues = z.infer<typeof sessionSchema>;

function toFormValues(session?: ProgramSession): Partial<SessionFormValues> {
  if (!session) {
    return {};
  }
  return {
    title: session.title,
    trackId: session.trackId ?? undefined,
    description: session.description ?? undefined,
    room: session.room ?? undefined,
    sessionType: session.sessionType ?? undefined,
    sessionDate: session.sessionDate.slice(0, 10),
    startTime: session.startTime.slice(0, 16),
    endTime: session.endTime.slice(0, 16),
  };
}

interface SessionFormProps {
  session?: ProgramSession;
  onSubmit: (values: SessionFormValues) => Promise<void>;
  submitLabel: string;
}

/** Every field is a plain input — SRS §36 requires full keyboard operability, so no drag-only interaction exists here. */
export function SessionForm({ session, onSubmit, submitLabel }: SessionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({ resolver: zodResolver(sessionSchema), defaultValues: toFormValues(session) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4" noValidate>
      <FormField label="Title" htmlFor="session-title" error={errors.title?.message}>
        <Input id="session-title" {...register('title')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Room (optional)" htmlFor="session-room">
          <Input id="session-room" {...register('room')} />
        </FormField>
        <FormField label="Type (optional)" htmlFor="session-type">
          <Input id="session-type" {...register('sessionType')} placeholder="e.g. Plenary, Workshop" />
        </FormField>
      </div>
      <FormField label="Description (optional)" htmlFor="session-description">
        <Input id="session-description" {...register('description')} />
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Date" htmlFor="session-date" error={errors.sessionDate?.message}>
          <Input id="session-date" type="date" {...register('sessionDate')} />
        </FormField>
        <FormField label="Start" htmlFor="session-start" error={errors.startTime?.message}>
          <Input id="session-start" type="datetime-local" {...register('startTime')} />
        </FormField>
        <FormField label="End" htmlFor="session-end" error={errors.endTime?.message}>
          <Input id="session-end" type="datetime-local" {...register('endTime')} />
        </FormField>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
