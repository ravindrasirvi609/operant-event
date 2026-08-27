'use client';

import { useState } from 'react';
import { PresentationAssignmentForm } from '@/components/program/presentation-assignment-form';
import { PresentationList } from '@/components/program/presentation-list';
import { PublishSessionButton } from '@/components/program/publish-session-button';
import { SessionForm, type SessionFormValues } from '@/components/program/session-form';
import { SessionStatusBadge } from '@/components/program/session-status-badge';
import { SpeakerAssignmentEditor } from '@/components/program/speaker-assignment-editor';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useSpeakers } from '@/hooks/use-speakers';
import { useAssignSpeakers, useSessionDetail, useUpdateSession } from '@/hooks/use-sessions';

export function SessionDetail({ conferenceId, sessionId }: { conferenceId: string; sessionId: string }) {
  const sessionDetailQuery = useSessionDetail(sessionId);
  const speakersQuery = useSpeakers(conferenceId);
  const updateSession = useUpdateSession(conferenceId);
  const assignSpeakers = useAssignSpeakers(conferenceId);
  const [saved, setSaved] = useState(false);

  return (
    <AsyncBoundary query={sessionDetailQuery}>
      {(session) => {
        const defaultAssignments = session.speakers.map((s) => ({ speakerId: s.speakerId, role: s.role }));
        return (
          <div className="max-w-xl space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">{session.title}</h1>
              <div className="flex items-center gap-2">
                <SessionStatusBadge status={session.status} />
                <PublishSessionButton conferenceId={conferenceId} sessionId={sessionId} status={session.status} />
              </div>
            </div>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Edit session</h2>
              <SessionForm
                session={session}
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
              <PresentationList sessionId={sessionId} />
              <PresentationAssignmentForm conferenceId={conferenceId} sessionId={sessionId} />
            </section>
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
