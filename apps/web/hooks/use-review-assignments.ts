'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { DashboardCounts } from '@/lib/reviewers/types';

function dashboardQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'review-assignments', 'dashboard'];
}

/**
 * Always the backend's own numbers — never derived client-side from a
 * separately-fetched assignment list. `markOverdue`'s scan timing is a
 * backend/worker concern (see docs/plans/worker/03-review-scheduler.md);
 * re-deriving `overdue` here would silently drift from it.
 */
export function useReviewDashboard(conferenceId: string) {
  return useQuery({
    queryKey: dashboardQueryKey(conferenceId),
    queryFn: () => apiGet<DashboardCounts>(`conferences/${conferenceId}/review-assignments/dashboard`),
    enabled: Boolean(conferenceId),
  });
}

export interface AssignReviewInput {
  abstractId: string;
  reviewerId: string;
  dueDate?: string;
}

/**
 * There is no endpoint to pre-flight-check a conflict of interest before
 * assigning — `ConflictOfInterestService.check()` only ever runs inside
 * this call, throwing a 409 on a real conflict. There is no separate
 * "preview" route to surface a warning before submitting.
 */
export function useAssignReview(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignReviewInput) =>
      apiPost(`conferences/${conferenceId}/review-assignments`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(conferenceId) });
    },
  });
}

export interface ReassignReviewInput {
  assignmentId: string;
  reviewerId: string;
  dueDate?: string;
}

export function useReassignReview(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, ...input }: ReassignReviewInput) =>
      apiPost(`review-assignments/${assignmentId}/reassign`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(conferenceId) });
    },
  });
}
