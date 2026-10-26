
'use client';

import { use } from 'react';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { SessionList } from '@/components/program/session-list';
import { useConference } from '@/hooks/use-conferences';

export default function ProgramPage({
  params,
}: {
  params: Promise<{ conferenceId: string }>;
}) {
  const { conferenceId } = use(params);
  const conferenceQuery = useConference(conferenceId);

  return (
    <div className="space-y-6">
      <AsyncBoundary query={conferenceQuery}>
        {(conference) => (
          <section className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Programme Setup
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {conference.name}
                </p>
              </div>

            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Start Date
                </p>
                <p className="mt-1 font-medium">
                  {conference.startDate.slice(0, 10)}
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  End Date
                </p>
                <p className="mt-1 font-medium">
                  {conference.endDate.slice(0, 10)}
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Venue
                </p>
                <p className="mt-1 font-medium">
                  {conference.venueName || 'Venue not specified'}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Timezone: {conference.timezone}
            </p>
          </section>
        )}
      </AsyncBoundary>

      <SessionList conferenceId={conferenceId} />
    </div>
  );
}
