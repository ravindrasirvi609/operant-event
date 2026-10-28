
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useConference } from '@/hooks/use-conferences';
import {
  useAssignSpeakers,
  useSessionDetail,
  useUpdateSession,
} from '@/hooks/use-sessions';
import { useSpeakers } from '@/hooks/use-speakers';

import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { SessionForm, type SessionFormValues } from '@/components/program/session-form';
import { SessionStatusBadge } from '@/components/program/session-status-badge';
import { PublishSessionButton } from '@/components/program/publish-session-button';
import { SpeakerAssignmentEditor } from '@/components/program/speaker-assignment-editor';
import { PresentationAssignmentForm } from '@/components/program/presentation-assignment-form';
import { PresentationList } from '@/components/program/presentation-list';

export function SessionDetail({
  conferenceId,
  sessionId,
}: {
  conferenceId: string;
  sessionId: string;
}) {
  const sessionDetailQuery = useSessionDetail(sessionId);
  const conferenceQuery = useConference(conferenceId);
  const speakersQuery = useSpeakers(conferenceId);

  const updateSession = useUpdateSession(conferenceId);
  const assignSpeakers = useAssignSpeakers(conferenceId);

  const [editing, setEditing] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Conference information */}
      <AsyncBoundary query={conferenceQuery}>
        {(conference) => (
          <section className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Conference
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              {conference.name}
            </h2>

            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <p>
                <span className="font-medium text-foreground">Venue:</span>{' '}
                {conference.venueName || 'Venue not specified'}
              </p>

              <p>
                <span className="font-medium text-foreground">Timezone:</span>{' '}
                {conference.timezone}
              </p>

              <p>
                <span className="font-medium text-foreground">
                  Conference dates:
                </span>{' '}
                {conference.startDate.slice(0, 10)} –{' '}
                {conference.endDate.slice(0, 10)}
              </p>
            </div>
          </section>
        )}
      </AsyncBoundary>

      {/* Session details */}
      <AsyncBoundary query={sessionDetailQuery}>
        {(session) => (
          <>
            <section className="rounded-xl border bg-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    Programme / Session details
                  </p>

                  <h1 className="mt-1 break-words text-2xl font-bold">
                    {session.title}
                  </h1>

                  <div className="mt-3">
                    <SessionStatusBadge status={session.status} />
                  </div>
                </div>

                
<div className="flex flex-wrap gap-2">
  <Button
    type="button"
    variant="outline"
    onClick={() => setEditing((current) => !current)}
  >
    {editing ? 'Cancel edit' : 'Edit session'}
  </Button>

  {session.status === 'PUBLISHED' && (
    <Link
      href={`/conferences/${conferenceId}/program/view`}
      className="inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
    >
      View Public Programme
    </Link>
  )}

  <PublishSessionButton
    conferenceId={conferenceId}
    sessionId={session.id}
    status={session.status}
  />
</div>

              </div>

              <div className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="mt-1 font-medium">
                    {session.sessionDate
                      ? session.sessionDate.slice(0, 10)
                      : 'Not set'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="mt-1 font-medium">
                    {new Date(session.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' – '}
                    {new Date(session.endTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Room / Venue</p>
                  <p className="mt-1 font-medium">
                    {session.room || 'Not assigned'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Session type</p>
                  <p className="mt-1 font-medium">
                    {session.sessionType || 'Standard session'}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {session.description || 'No description added.'}
                  </p>
                </div>
              </div>
            </section>

            {/* Edit existing session */}
            {editing && (
              <section className="rounded-xl border bg-card p-5">
                <h2 className="mb-4 text-lg font-semibold">
                  Edit session details
                </h2>

                <SessionForm
                  conferenceId={conferenceId}
                  session={session}
                  submitLabel={
                    updateSession.isPending ? 'Saving...' : 'Save changes'
                  }
                  onSubmit={async (values: SessionFormValues) => {
                    await updateSession.mutateAsync({
                      sessionId: session.id,
                      input: values,
                    });

                    setEditing(false);
                  }}
                />
              </section>
            )}

            {/* Speakers and session roles */}
            <section className="rounded-xl border bg-card p-5">
              <h2 className="text-lg font-semibold">
                Speakers & Session Chair
              </h2>

              <p className="mt-1 mb-5 text-sm text-muted-foreground">
                Assign speakers to this session and choose their roles.
                Use Chair or Co-chair for session leadership.
              </p>

              <AsyncBoundary query={speakersQuery}>
                {(speakers) => (
                  <SpeakerAssignmentEditor
                    speakers={speakers}
                    defaultAssignments={(session.speakers ?? []).map(
                      (assignment) => ({
                        speakerId: assignment.speakerId,
                        role: assignment.role,
                      }),
                    )}
                    onSave={async (assignments) => {
                      await assignSpeakers.mutateAsync({
                        sessionId: session.id,
                        assignments,
                      });
                    }}
                  />
                )}
              </AsyncBoundary>
            </section>

            {/* Accepted abstracts / presentations */}
            <section className="rounded-xl border bg-card p-5">
              <h2 className="text-lg font-semibold">
                Session items & Presentations
              </h2>

              <p className="mt-1 mb-5 text-sm text-muted-foreground">
                Add accepted abstracts to this session and manage their
                presentation times.
              </p>

              <PresentationList
                conferenceId={session.conferenceId}
                sessionId={session.id}
              />
              <div className="mt-6 border-t pt-5">
                <h3 className="mb-4 font-semibold">
                  Add presentation
                </h3>

                <PresentationAssignmentForm
                  conferenceId={conferenceId}
                  sessionId={session.id}
                />
              </div>
            </section>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
