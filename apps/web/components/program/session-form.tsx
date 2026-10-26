
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useConference } from '@/hooks/use-conferences';
import { validateSessionWindow } from '@/lib/program/validate-session-window';
import type { ProgramSession } from '@/lib/program/types';

const sessionSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter a session title.'),
    trackId: z.string().optional(),
    description: z.string().optional(),
    room: z.string().trim().min(1, 'Enter a room name.'),
    sessionType: z.string().optional(),
    sessionDate: z.string().min(1, 'Choose a date.'),
    startTime: z.string().min(1, 'Choose a start time.'),
    endTime: z.string().min(1, 'Choose an end time.'),
  })
  .refine(
    (values) => {
      if (!values.sessionDate || !values.startTime || !values.endTime) {
        return true;
      }

      return (
        validateSessionWindow(
          `${values.sessionDate}T${values.startTime}:00`,
          `${values.sessionDate}T${values.endTime}:00`,
        ) === null
      );
    },
    {
      message: 'End time must be after start time.',
      path: ['endTime'],
    },
  );

export type SessionFormValues = z.infer<typeof sessionSchema>;

function getTimeValue(value: string) {
  if (value.includes('T')) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${hours}:${minutes}`;
    }
  }

  return value.slice(0, 5);
}

function toFormValues(
  session?: ProgramSession,
): Partial<SessionFormValues> {
  if (!session) {
    return {};
  }

  return {
    title: session.title,
    trackId: session.trackId ?? undefined,
    description: session.description ?? undefined,
    room: session.room ?? '',
    sessionType: session.sessionType ?? undefined,
    sessionDate: session.sessionDate.slice(0, 10),
    startTime: getTimeValue(session.startTime),
    endTime: getTimeValue(session.endTime),
  };
}

interface SessionFormProps {
  conferenceId: string;
  session?: ProgramSession;
  onSubmit: (values: SessionFormValues) => Promise<void>;
  submitLabel: string;
}

export function SessionForm({
  conferenceId,
  session,
  onSubmit,
  submitLabel,
}: SessionFormProps) {
  const conferenceQuery = useConference(conferenceId);
  const [dateError, setDateError] = useState('');

  const conference = conferenceQuery.data;
  const minDate = conference?.startDate.slice(0, 10);
  const maxDate = conference?.endDate.slice(0, 10);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: toFormValues(session),
  });

  const handleFormSubmit = async (values: SessionFormValues) => {
    setDateError('');

    if (!conference) {
      setDateError('Conference details are still loading. Please try again.');
      return;
    }

    const selectedDate = values.sessionDate;

    if (
      selectedDate < conference.startDate.slice(0, 10) ||
      selectedDate > conference.endDate.slice(0, 10)
    ) {
      setDateError(
        `Choose a date between ${conference.startDate.slice(0, 10)} and ${conference.endDate.slice(0, 10)}.`,
      );
      return;
    }

    const room = values.room.trim();

    if (!room) {
      setDateError('Enter the room or hall where this session will take place.');
      return;
    }

    await onSubmit({
      ...values,
      title: values.title.trim(),
      room,
      startTime: `${values.sessionDate}T${values.startTime}:00`,
      endTime: `${values.sessionDate}T${values.endTime}:00`,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="w-full max-w-2xl space-y-4"
      noValidate
    >
      {conference ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{conference.name}</p>
          <p className="mt-1 text-muted-foreground">
            Main venue: {conference.venueName || 'Not specified'}
          </p>
          <p className="text-muted-foreground">
            Session dates: {minDate} to {maxDate}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Loading conference dates and venue…
        </p>
      )}

      <FormField
        label="Title"
        htmlFor="session-title"
        error={errors.title?.message}
      >
        <Input
          id="session-title"
          {...register('title')}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField
          label="Room / Hall (required)"
          htmlFor="session-room"
          error={errors.room?.message}
        >
          <Input
            id="session-room"
            {...register('room')}
            required
          />
        </FormField>

        
<FormField label="Session type" htmlFor="session-type">
  <select
    id="session-type"
    {...register('sessionType')}
    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
  >
    <option value="">Select session type</option>
    <option value="STANDARD">Standard session</option>
    <option value="ORAL">Oral presentations</option>
    <option value="POSTER">Poster presentations</option>
    <option value="KEYNOTE">Keynote</option>
    <option value="INVITED_TALK">Invited talk</option>
    <option value="BREAK">Break</option>
    <option value="LUNCH">Lunch</option>
    <option value="NETWORKING">Networking</option>
    <option value="SPECIAL_EVENT">Special event</option>
  </select>
</FormField>


      </div>

      <FormField
        label="Description (optional)"
        htmlFor="session-description"
      >
        <Input
          id="session-description"
          {...register('description')}
          placeholder="Session details"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField
          label="Date"
          htmlFor="session-date"
          error={errors.sessionDate?.message}
        >
          <Input
            id="session-date"
            type="date"
            min={minDate}
            max={maxDate}
            {...register('sessionDate')}
          />
        </FormField>

        <FormField
          label="Start"
          htmlFor="session-start"
          error={errors.startTime?.message}
        >
          <Input
            id="session-start"
            type="time"
            step="60"
            {...register('startTime')}
          />
        </FormField>

        <FormField
          label="End"
          htmlFor="session-end"
          error={errors.endTime?.message}
        >
          <Input
            id="session-end"
            type="time"
            step="60"
            {...register('endTime')}
          />
        </FormField>
      </div>

      {dateError ? (
        <p role="alert" className="text-sm text-destructive">
          {dateError}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting || conferenceQuery.isPending || !conference}
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
