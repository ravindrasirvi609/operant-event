'use client';

import { AsyncBoundary } from '@/components/query/async-boundary';
import { usePublicProgram } from '@/hooks/use-sessions';

export function PublicProgramView({ conferenceId }: { conferenceId: string }) {
  const programQuery = usePublicProgram(conferenceId);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Program</h1>
      <AsyncBoundary
        query={programQuery}
        empty={<p className="text-sm text-muted-foreground">No sessions have been published yet.</p>}
      >
        {(sessions) => (
          <ul className="space-y-4">
            {sessions.map((session) => (
              <li key={session.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{session.title}</h2>
                  <span className="text-sm text-muted-foreground">{new Date(session.startTime).toLocaleString()}</span>
                </div>
                {session.room ? <p className="text-sm text-muted-foreground">Room: {session.room}</p> : null}
                {session.description ? <p className="mt-1 text-sm">{session.description}</p> : null}
                {session.speakers.length > 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {session.speakers.map((s) => `${s.speaker.name} (${s.role})`).join(', ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}
