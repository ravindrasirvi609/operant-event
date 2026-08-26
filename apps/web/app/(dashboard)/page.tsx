'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ConferenceStatusBadge } from '@/components/conferences/conference-status-badge';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { useConferences } from '@/hooks/use-conferences';
import { useOrganizations } from '@/hooks/use-organizations';

export default function DashboardHomePage() {
  const organizationsQuery = useOrganizations();
  const { activeOrgId, setActiveOrganization } = useActiveOrganization();
  const conferencesQuery = useConferences();

  useEffect(() => {
    if (!activeOrgId && organizationsQuery.data && organizationsQuery.data.length > 0) {
      setActiveOrganization(organizationsQuery.data[0].id);
    }
  }, [activeOrgId, organizationsQuery.data, setActiveOrganization]);

  return (
    <AsyncBoundary
      query={organizationsQuery}
      empty={
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">Welcome to Operant Event</h1>
          <p className="text-sm text-muted-foreground">
            You are not a member of any organization yet. Create one to get started.
          </p>
          <Button render={<Link href="/organizations/new" />}>Create an organization</Button>
        </div>
      }
    >
      {() =>
        !activeOrgId ? (
          <p className="text-sm text-muted-foreground">Loading your organization…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Conferences</h1>
              <Button render={<Link href="/conferences/new" />}>New conference</Button>
            </div>
            <AsyncBoundary
              query={conferencesQuery}
              empty={<p className="text-sm text-muted-foreground">No conferences yet.</p>}
            >
              {(conferences) => (
                <ul className="divide-y rounded-lg border">
                  {conferences.map((conference) => (
                    <li key={conference.id}>
                      <Link
                        href={`/conferences/${conference.id}`}
                        className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium">{conference.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {conference.startDate.slice(0, 10)} – {conference.endDate.slice(0, 10)}
                          </p>
                        </div>
                        <ConferenceStatusBadge status={conference.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </AsyncBoundary>
          </div>
        )
      }
    </AsyncBoundary>
  );
}
