'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SessionForm, type SessionFormValues } from '@/components/program/session-form';
import { SessionStatusBadge } from '@/components/program/session-status-badge';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useCreateSession, useSessions } from '@/hooks/use-sessions';

export function SessionList({ conferenceId }: { conferenceId: string }) {
  const sessionsQuery = useSessions(conferenceId);
  const createSession = useCreateSession(conferenceId);
  const [creating, setCreating] = useState(false);

  return (
    <div className="max-w-3xl space-y-6">
      <AsyncBoundary query={sessionsQuery} empty={<p className="text-sm text-muted-foreground">No sessions yet.</p>}>
        {(sessions) => (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1">Title</th>
                <th className="py-1">When</th>
                <th className="py-1">Room</th>
                <th className="py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-t">
                  <td className="py-2">
                    <Link href={`/conferences/${conferenceId}/program/${session.id}`} className="underline">
                      {session.title}
                    </Link>
                  </td>
                  <td className="py-2">{new Date(session.startTime).toLocaleString()}</td>
                  <td className="py-2">{session.room ?? '—'}</td>
                  <td className="py-2">
                    <SessionStatusBadge status={session.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>

      {creating ? (
        <SessionForm
          submitLabel="Create session"
          onSubmit={async (values: SessionFormValues) => {
            await createSession.mutateAsync(values);
            setCreating(false);
          }}
        />
      ) : (
        <Button variant="outline" onClick={() => setCreating(true)}>
          New session
        </Button>
      )}
    </div>
  );
}
