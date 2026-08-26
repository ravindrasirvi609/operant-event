'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { Abstract } from '@/lib/abstracts/types';

function organizerAbstractsQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'abstracts'];
}

/**
 * `findAllForOrganizer` has no pagination, status/track filtering, or
 * search server-side — this is an unbounded fetch of every abstract in
 * the conference. Filtering/search below happens entirely client-side
 * over that full list; for a conference with a very large number of
 * submissions this will not scale, which is a backend gap (no `?page`/
 * `?status`/`?q` params exist to add), not something the frontend can
 * fix on its own.
 */
export function useOrganizerAbstracts(conferenceId: string) {
  return useQuery({
    queryKey: organizerAbstractsQueryKey(conferenceId),
    queryFn: () => apiGet<Abstract[]>(`conferences/${conferenceId}/abstracts`),
    enabled: Boolean(conferenceId),
  });
}

/** Derived from the same unbounded list — see useOrganizerAbstracts' note; there's no `GET .../abstracts/:id` either. */
export function useOrganizerAbstract(conferenceId: string, abstractId: string) {
  return useQuery({
    queryKey: organizerAbstractsQueryKey(conferenceId),
    queryFn: () => apiGet<Abstract[]>(`conferences/${conferenceId}/abstracts`),
    enabled: Boolean(conferenceId),
    select: (abstracts) => abstracts.find((abstract) => abstract.id === abstractId),
  });
}

export function useForceSubmitAbstract(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (abstractId: string) =>
      apiPost<Abstract>(`conferences/${conferenceId}/abstracts/${abstractId}/force-submit`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizerAbstractsQueryKey(conferenceId) });
    },
  });
}
