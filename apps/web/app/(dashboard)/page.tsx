'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  Building2,
  CalendarPlus,
  Rocket,
  Search,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ConferenceCard } from '@/components/conferences/conference-card';

import { STATUS_LABELS } from '@/components/conferences/conference-status-badge';

import { AsyncBoundary } from '@/components/query/async-boundary';

import { useActiveOrganization } from '@/hooks/use-active-organization';
import { useConferences } from '@/hooks/use-conferences';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganizations } from '@/hooks/use-organizations';

import { apiGet } from '@/lib/api/client';

import {
  CONFERENCE_STATUSES,
  type Conference,
  type ConferenceStatus,
} from '@/lib/conferences/types';


function ConferenceGridSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading conferences"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-xl border bg-card p-5"
          >
            <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />

            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />

            <div className="h-3 w-full animate-pulse rounded bg-muted" />

            <div className="mt-auto flex gap-4 border-t pt-3">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ),
      )}
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
        <h2 className="text-base font-semibold">
          {title}
        </h2>

        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}


function ConferenceList({
  conferences,
}: {
  conferences: Conference[];
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] =
    useState<ConferenceStatus | 'all'>('all');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conferences.filter(
      (conference) => {
        const matchesStatus =
          status === 'all' ||
          conference.status === status;

        const matchesSearch =
          query.length === 0 ||
          conference.name
            .toLowerCase()
            .includes(query) ||
          conference.city
            ?.toLowerCase()
            .includes(query) ||
          conference.venueName
            ?.toLowerCase()
            .includes(query);

        return (
          matchesStatus &&
          matchesSearch
        );
      },
    );
  }, [
    conferences,
    search,
    status,
  ]);

  const hasFilters =
    search.trim().length > 0 ||
    status !== 'all';

  return (
    <div className="space-y-4">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

        <div className="relative flex-1 sm:max-w-xs">

          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search conferences…"
            className="pl-8"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) =>
            value &&
            setStatus(
              value as
                | ConferenceStatus
                | 'all',
            )
          }
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All statuses
            </SelectItem>

            {CONFERENCE_STATUSES.map(
              (value) => (
                <SelectItem
                  key={value}
                  value={value}
                >
                  {STATUS_LABELS[value]}
                </SelectItem>
              ),
            )}
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
              <X />
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {filtered.map(
            (conference) => (
              <ConferenceCard
                key={conference.id}
                conference={conference}
              />
            ),
          )}

        </div>
      )}


      {hasFilters &&
      filtered.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of{' '}
          {conferences.length}{' '}
          conferences
        </p>
      ) : null}

    </div>
  );
}


function AuthorConferenceList({
  conferences,
}: {
  conferences: Conference[];
}) {
  const [search, setSearch] =
    useState('');

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return conferences.filter(
      (conference) => {
        if (!query) {
          return true;
        }

        return (
          conference.name
            .toLowerCase()
            .includes(query) ||
          conference.city
            ?.toLowerCase()
            .includes(query) ||
          conference.venueName
            ?.toLowerCase()
            .includes(query)
        );
      },
    );
  }, [conferences, search]);


  return (
    <div className="space-y-4">

      <div className="relative max-w-md">

        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Search conferences…"
          className="pl-8 pr-8"
        />

        {search ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() =>
              setSearch('')
            }
          >
            <X className="size-4" />
          </button>
        ) : null}

      </div>


      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="No open conferences"
          description={
            search
              ? 'No open conferences match your search.'
              : 'There are currently no conferences accepting abstract submissions.'
          }
          action={
            search ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSearch('')
                }
              >
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">


{filtered.map((conference) => (
  <div
    key={conference.id}
    className="flex flex-col gap-3 rounded-xl border p-4"
  >
    <ConferenceCard
      conference={conference}
      href={`/author/conferences/${conference.id}`}
    />

    <Button
      className="w-full"
      variant="outline"
      render={
        <Link
          href={`/conferences/${conference.id}/register`}
        />
      }
    >
      Register as Participant
    </Button>
  </div>
))}


        </div>
      )}


      {search &&
      filtered.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of{' '}
          {conferences.length}{' '}
          conferences
        </p>
      ) : null}

    </div>
  );
}


export default function DashboardHomePage() {

  const organizationsQuery =
    useOrganizations();

  const {
    activeOrgId,
    setActiveOrganization,
  } = useActiveOrganization();

  const conferencesQuery =
    useConferences();

  const {
    data: currentUser,
    isLoading:
      isCurrentUserLoading,
  } = useCurrentUser();


  /**
   * Author conference discovery.
   *
   * This query is enabled only when the
   * authenticated user has no organization
   * membership and is not a Super Admin.
   *
   * Authors do not need organization membership
   * to discover conferences accepting submissions.
   */
  const authorConferencesQuery =
    useQuery({
      queryKey: [
        'conferences',
        'for-submission',
      ],

      queryFn: () =>
        apiGet<Conference[]>(
          'conferences/for-submission',
        ),

      enabled:
        !isCurrentUserLoading &&
        Boolean(currentUser) &&
        !currentUser?.isSuperAdmin &&
        organizationsQuery.data !== undefined &&
        organizationsQuery.data.length === 0,
    });


  useEffect(() => {
    if (
      !activeOrgId &&
      organizationsQuery.data &&
      organizationsQuery.data.length > 0
    ) {
      setActiveOrganization(
        organizationsQuery.data[0].id,
      );
    }
  }, [
    activeOrgId,
    organizationsQuery.data,
    setActiveOrganization,
  ]);


  return (
    <AsyncBoundary
      query={organizationsQuery}

      empty={
        <div className="space-y-6">

          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Operant Event
          </h1>


          {isCurrentUserLoading ? (
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />

          ) : currentUser?.isSuperAdmin ? (
  <div className="space-y-4">
    <div>
      <p className="text-base font-medium">
        You have platform-wide Super Admin access.
      </p>

      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Manage organizations, provision new organization owners, and oversee
        the entire Operant Event platform from the Organizations section.
      </p>
    </div>

    <div className="flex flex-wrap gap-3">
      <Button
        render={
          <Link href="/organizations" />
        }
      >
        <Building2 className="size-4" />
        Manage organizations
      </Button>

      <Button
        variant="outline"
        render={
          <Link href="/organizations/new" />
        }
      >
        <Building2 className="size-4" />
        Create an organization
      </Button>
    </div>
  </div>
          ) : (

            <>
              <div>
                <h2 className="text-xl font-semibold">
                  Available Conferences
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a conference to submit your abstract.
                </p>
              </div>

              <Link
  href="/certificates"
  className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
>
  My Certificates
</Link>


              <AsyncBoundary
                query={
                  authorConferencesQuery
                }

                loading={
                  <ConferenceGridSkeleton />
                }

                empty={
                  <EmptyState
                    icon={CalendarPlus}
                    title="No open conferences"
                    description="There are currently no conferences accepting abstract submissions."
                  />
                }
              >
                {(conferences) => (
                  <AuthorConferenceList
                    conferences={
                      conferences
                    }
                  />
                )}
              </AsyncBoundary>
            </>
          )}

        </div>
      }
    >
      {() =>
        !activeOrgId ? (
          <p className="text-sm text-muted-foreground">
            Loading your organization…
          </p>
        ) : (
          <div className="space-y-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

              <div>

                <h1 className="text-2xl font-semibold tracking-tight">
                  Conferences
                </h1>

                <p className="text-sm text-muted-foreground">
                  {conferencesQuery.data
                    ? `${conferencesQuery.data.length} conference${
                        conferencesQuery.data.length === 1
                          ? ''
                          : 's'
                      }`
                    : 'All your conferences in one place'}
                </p>

              </div>


              <Button
                render={
                  <Link href="/conferences/new" />
                }
              >
                <CalendarPlus />
                New conference
              </Button>

            </div>


            <AsyncBoundary
              query={conferencesQuery}

              loading={
                <ConferenceGridSkeleton />
              }

              empty={
                <EmptyState
                  icon={CalendarPlus}
                  title="No conferences yet"
                  description="Create your first conference to start accepting abstracts and registrations."
                  action={
                    <Button
                      render={
                        <Link href="/conferences/new" />
                      }
                    >
                      Create your first conference
                    </Button>
                  }
                />
              }
            >
              {(conferences) => (
                <ConferenceList
                  conferences={
                    conferences
                  }
                />
              )}
            </AsyncBoundary>

          </div>
        )
      }
    </AsyncBoundary>
  );
}