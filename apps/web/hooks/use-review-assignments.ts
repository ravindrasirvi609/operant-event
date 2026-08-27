'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { AbstractReviewAssignment, ConflictCheckResult, DashboardCounts } from '@/lib/reviewers/types';

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

/** Preview ahead of assignment — the same check `assign` enforces server-side, surfaced early as a warning. */
export function useConflictCheck(conferenceId: string, reviewerId: string, abstractId: string) {
  return useQuery({
    queryKey: ['conferences', conferenceId, 'reviewers', reviewerId, 'conflict-check', abstractId],
    queryFn: () =>
      apiGet<ConflictCheckResult>(
        `conferences/${conferenceId}/reviewers/${reviewerId}/conflict-check?abstractId=${abstractId}`,
      ),
    enabled: Boolean(reviewerId) && Boolean(abstractId),
  });
}

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

/** Every assignment for the abstract with its submitted review, if any — for organizer/chair context ahead of a decision. */
export function useAbstractReviews(conferenceId: string, abstractId: string) {
  return useQuery({
    queryKey: ['conferences', conferenceId, 'abstracts', abstractId, 'reviews'],
    queryFn: () =>
      apiGet<AbstractReviewAssignment[]>(`conferences/${conferenceId}/abstracts/${abstractId}/reviews`),
    enabled: Boolean(conferenceId) && Boolean(abstractId),
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
