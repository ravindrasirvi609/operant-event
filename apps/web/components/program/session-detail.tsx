'use client';

import { useState } from 'react';
import { PresentationAssignmentForm } from '@/components/program/presentation-assignment-form';
import { PublishSessionButton } from '@/components/program/publish-session-button';
import { SessionForm, type SessionFormValues } from '@/components/program/session-form';
import { SessionStatusBadge } from '@/components/program/session-status-badge';
import { SpeakerAssignmentEditor } from '@/components/program/speaker-assignment-editor';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useSpeakers } from '@/hooks/use-speakers';
import { useAssignSpeakers, usePublicProgram, useSessions, useUpdateSession } from '@/hooks/use-sessions';

/**
 * There is no organizer-facing "get one session with its current
 * speakers" endpoint — `GET .../sessions` returns bare rows, and
 * `PUT .../speakers` is write-only. The speaker editor below can only
 * pre-fill from the *public* program (which only ever shows PUBLISHED
 * sessions), so a still-DRAFT session's editor always starts empty —
 * disclosed here rather than silently guessing at existing assignments.
 */
export function SessionDetail({ conferenceId, sessionId }: { conferenceId: string; sessionId: string }) {
  const sessionsQuery = useSessions(conferenceId);
  const speakersQuery = useSpeakers(conferenceId);
  const publicProgramQuery = usePublicProgram(conferenceId);
  const updateSession = useUpdateSession(conferenceId);
  const assignSpeakers = useAssignSpeakers(conferenceId);
  const [saved, setSaved] = useState(false);

  const session = sessionsQuery.data?.find((item) => item.id === sessionId);
  const publishedSession = publicProgramQuery.data?.find((item) => item.id === sessionId);
  const defaultAssignments = publishedSession?.speakers.map((s) => ({ speakerId: s.speakerId, role: s.role })) ?? [];

  return (
    <AsyncBoundary query={sessionsQuery} isEmpty={() => !session} empty={<p className="text-sm text-muted-foreground">Session not found.</p>}>
      {() => {
        const s = session!;
        return (
          <div className="max-w-xl space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">{s.title}</h1>
              <div className="flex items-center gap-2">
                <SessionStatusBadge status={s.status} />
                <PublishSessionButton conferenceId={conferenceId} sessionId={sessionId} status={s.status} />
              </div>
            </div>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Edit session</h2>
              <SessionForm
                session={s}
                submitLabel="Save changes"
                onSubmit={async (values: SessionFormValues) => {
                  setSaved(false);
                  await updateSession.mutateAsync({ sessionId, input: values });
                  setSaved(true);
                }}
              />
              {saved ? <p role="status" className="text-sm text-muted-foreground">Saved.</p> : null}
            </section>

            <section className="space-y-3 border-t pt-6">
              <h2 className="text-sm font-semibold">Speakers</h2>
              <AsyncBoundary query={speakersQuery} empty={<p className="text-sm text-muted-foreground">Add speakers to the roster first.</p>}>
                {(speakers) => (
                  <SpeakerAssignmentEditor
                    speakers={speakers}
                    defaultAssignments={defaultAssignments}
                    onSave={async (assignments) => {
                      await assignSpeakers.mutateAsync({ sessionId, assignments });
                    }}
                  />
                )}
              </AsyncBoundary>
            </section>

            <section className="space-y-3 border-t pt-6">
              <h2 className="text-sm font-semibold">Presentations</h2>
              {publishedSession && publishedSession.presentations.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {publishedSession.presentations.map((presentation) => (
                    <li key={presentation.id}>
                      {new Date(presentation.startTime).toLocaleTimeString()} –{' '}
                      {new Date(presentation.endTime).toLocaleTimeString()}
                      {presentation.presentationType ? ` · ${presentation.presentationType}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No presentations visible yet — the assigned-presentations list only shows once this session is published.
                </p>
              )}
              <PresentationAssignmentForm conferenceId={conferenceId} sessionId={sessionId} />
            </section>
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
