'use client';

import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useAuthSessions, useRevokeSession } from '@/hooks/use-auth-sessions';

export default function AccountSessionsPage() {
  const sessionsQuery = useAuthSessions();
  const revokeSession = useRevokeSession();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Active sessions</h1>
      <AsyncBoundary
        query={sessionsQuery}
        empty={<p className="text-sm text-muted-foreground">No active sessions.</p>}
      >
        {(sessions) => (
          <ul className="divide-y rounded-lg border">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{session.userAgent ?? 'Unknown device'}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.ipAddress ?? 'Unknown IP'} · signed in {new Date(session.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={revokeSession.isPending}
                  onClick={() => revokeSession.mutate(session.id)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}
