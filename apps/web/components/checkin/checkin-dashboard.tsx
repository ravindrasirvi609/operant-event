'use client';

import { AsyncBoundary } from '@/components/query/async-boundary';
import { useCheckinDashboard } from '@/hooks/use-checkins';
import { countByType } from '@/lib/checkin/count-by-type';

const POLL_INTERVAL_MS = 12000;

/** Polls every 12s while the tab is open — no WebSocket gateway exists, so this is the pragmatic match for a "live" event-day view. */
export function CheckinDashboard({ conferenceId }: { conferenceId: string }) {
  const checkinsQuery = useCheckinDashboard(conferenceId, { refetchInterval: POLL_INTERVAL_MS });

  return (
    <AsyncBoundary
      query={checkinsQuery}
      empty={<p className="text-sm text-muted-foreground">No check-ins yet.</p>}
    >
      {(checkins) => {
        const counts = countByType(checkins);
        return (
          <div className="max-w-3xl space-y-6">
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(counts).map(([type, count]) => (
                <div key={type} className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-semibold">{count}</p>
                  <p className="text-xs text-muted-foreground">{type}</p>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">Registration</th>
                  <th className="py-1">Type</th>
                  <th className="py-1">Checked in at</th>
                  <th className="py-1">Device</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((checkin) => (
                  <tr key={checkin.id} className="border-t">
                    <td className="py-2">{checkin.registration.registrationNumber}</td>
                    <td className="py-2">{checkin.checkinType}</td>
                    <td className="py-2">{new Date(checkin.checkedInAt).toLocaleString()}</td>
                    <td className="py-2 text-xs text-muted-foreground">{checkin.deviceId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
