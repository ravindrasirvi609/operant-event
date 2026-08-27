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

/** `POST reviewers` accepts either `userId` or `email` — the backend resolves `email` to the matching user internally. */
export function useAddReviewer(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId?: string; email?: string }) => apiPost<Reviewer>('reviewers', input),
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
