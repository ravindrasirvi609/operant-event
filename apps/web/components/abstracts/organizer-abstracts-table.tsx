'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AbstractStatusBadge } from '@/components/abstracts/abstract-status-badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useOrganizerAbstracts } from '@/hooks/use-organizer-abstracts';
import { ABSTRACT_STATUSES, type AbstractStatus } from '@/lib/abstracts/types';

const ALL_STATUSES = 'ALL';

/**
 * `findAllForOrganizer` has no server-side pagination, filtering, or
 * search — everything below runs client-side over the full unbounded
 * list the backend returns. Fine for a small conference; a real gap for
 * a large one (see the hook's own comment) — flagged, not silently
 * worked around.
 */
export function OrganizerAbstractsTable({ conferenceId }: { conferenceId: string }) {
  const abstractsQuery = useOrganizerAbstracts(conferenceId);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return (abstractsQuery.data ?? []).filter((abstract) => {
      if (statusFilter !== ALL_STATUSES && abstract.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        const haystack = `${abstract.title} ${abstract.submissionNumber ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [abstractsQuery.data, statusFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          placeholder="Search by title or submission number…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {ABSTRACT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AsyncBoundary
        query={abstractsQuery}
        empty={<p className="text-sm text-muted-foreground">No abstracts submitted yet.</p>}
      >
        {() =>
          filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No abstracts match this filter.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {filtered.map((abstract) => (
                <li key={abstract.id}>
                  <Link
                    href={`/conferences/${conferenceId}/abstracts/${abstract.id}`}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{abstract.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {abstract.submissionNumber ?? 'No submission number yet'} · {abstract.submissionType}
                      </p>
                    </div>
                    <AbstractStatusBadge status={abstract.status as AbstractStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )
        }
      </AsyncBoundary>
    </div>
  );
}
