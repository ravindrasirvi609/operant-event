'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Rocket, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConferenceCard } from '@/components/conferences/conference-card';
import { STATUS_LABELS } from '@/components/conferences/conference-status-badge';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { useConferences } from '@/hooks/use-conferences';
import { useOrganizations } from '@/hooks/use-organizations';
import { CONFERENCE_STATUSES, type Conference, type ConferenceStatus } from '@/lib/conferences/types';

function ConferenceGridSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading conferences" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="mt-auto flex gap-4 border-t pt-3">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Rocket;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ConferenceList({ conferences }: { conferences: Conference[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ConferenceStatus | 'all'>('all');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conferences.filter((conference) => {
      const matchesStatus = status === 'all' || conference.status === status;
      const matchesSearch =
        query.length === 0 ||
        conference.name.toLowerCase().includes(query) ||
        conference.city?.toLowerCase().includes(query) ||
        conference.venueName?.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [conferences, search, status]);

  const hasFilters = search.trim().length > 0 || status !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conferences…"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(value) => value && setStatus(value as ConferenceStatus | 'all')}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CONFERENCE_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No conferences match your search or filter."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatus('all');
              }}
            >
              <X /> Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((conference) => (
            <ConferenceCard key={conference.id} conference={conference} />
          ))}
        </div>
      )}
      {hasFilters && filtered.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {conferences.length} conferences
        </p>
      ) : null}
    </div>
  );
}

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
        <EmptyState
          icon={Rocket}
          title="Welcome to Operant Event"
          description="You are not a member of any organization yet. Create one to get started."
          action={<Button render={<Link href="/organizations/new" />}>Create an organization</Button>}
        />
      }
    >
      {() =>
        !activeOrgId ? (
          <p className="text-sm text-muted-foreground">Loading your organization…</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Conferences</h1>
                <p className="text-sm text-muted-foreground">
                  {conferencesQuery.data
                    ? `${conferencesQuery.data.length} conference${conferencesQuery.data.length === 1 ? '' : 's'}`
                    : 'All your conferences in one place'}
                </p>
              </div>
              <Button render={<Link href="/conferences/new" />}>
                <CalendarPlus /> New conference
              </Button>
            </div>

            <AsyncBoundary
              query={conferencesQuery}
              loading={<ConferenceGridSkeleton />}
              empty={
                <EmptyState
                  icon={CalendarPlus}
                  title="No conferences yet"
                  description="Create your first conference to start accepting abstracts and registrations."
                  action={<Button render={<Link href="/conferences/new" />}>Create your first conference</Button>}
                />
              }
            >
              {(conferences) => <ConferenceList conferences={conferences} />}
            </AsyncBoundary>
          </div>
        )
      }
    </AsyncBoundary>
  );
}
