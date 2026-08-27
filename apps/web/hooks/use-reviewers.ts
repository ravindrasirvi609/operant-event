'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '@/lib/api/client';
import type { Reviewer } from '@/lib/reviewers/types';

function reviewersQueryKey(organizationId: string) {
  return ['organizations', organizationId, 'reviewers'];
}

export function useReviewers(organizationId: string) {
  return useQuery({
    queryKey: reviewersQueryKey(organizationId),
    queryFn: () => apiGet<Reviewer[]>('reviewers'),
    enabled: Boolean(organizationId),
  });
}

/**
 * `POST reviewers` requires a raw internal `userId` — there is no
 * email-based user-search endpoint anywhere in the backend (the only
 * email-driven user-touching route is `organizations/:id/members`,
 * which invites the user as an org member as a side effect, which isn't
 * the same thing and isn't safe to silently repurpose here). Until a
 * real lookup endpoint exists, the caller must already know the exact
 * user id — disclosed directly in `<AddReviewerForm>`.
 */
export function useAddReviewer(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiPost<Reviewer>('reviewers', { userId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewersQueryKey(organizationId) });
    },
  });
}

export interface UpdateReviewerProfileInput {
  institution?: string;
  designation?: string;
  bio?: string;
  expertise?: string[];
  keywords?: string[];
}

export function useUpdateReviewerProfile(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewerId, input }: { reviewerId: string; input: UpdateReviewerProfileInput }) =>
      apiPut(`reviewers/${reviewerId}/profile`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewersQueryKey(organizationId) });
    },
  });
}
