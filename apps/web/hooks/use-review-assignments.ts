'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  apiGet,
  apiPost,
} from '@/lib/api/client';

import type {
  AbstractReviewAssignment,
  ConflictCheckResult,
  DashboardCounts,
} from '@/lib/reviewers/types';

function dashboardQueryKey(
  conferenceId: string,
) {
  return [
    'conferences',
    conferenceId,
    'review-assignments',
    'dashboard',
  ];
}

/**
 * Backend-owned dashboard numbers.
 *
 * We do not calculate these values client-side.
 */
export function useReviewDashboard(
  conferenceId: string,
) {
  return useQuery({
    queryKey:
      dashboardQueryKey(conferenceId),

    queryFn: () =>
      apiGet<DashboardCounts>(
        `conferences/${conferenceId}/review-assignments/dashboard`,
      ),

    enabled:
      Boolean(conferenceId),
  });
}

export interface AssignReviewInput {
  abstractId: string;
  reviewerId: string;
  dueDate?: string;
}

/**
 * Conflict preview before manual assignment.
 *
 * The backend performs the final conflict validation again.
 */
export function useConflictCheck(
  conferenceId: string,
  reviewerId: string,
  abstractId: string,
) {
  return useQuery({
    queryKey: [
      'conferences',
      conferenceId,
      'reviewers',
      reviewerId,
      'conflict-check',
      abstractId,
    ],

    queryFn: () =>
      apiGet<ConflictCheckResult>(
        `conferences/${conferenceId}/reviewers/${reviewerId}/conflict-check?abstractId=${abstractId}`,
      ),

    enabled:
      Boolean(reviewerId) &&
      Boolean(abstractId),
  });
}

/**
 * Manual reviewer assignment.
 */
export function useAssignReview(
  conferenceId: string,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (
      input: AssignReviewInput,
    ) =>
      apiPost(
        `conferences/${conferenceId}/review-assignments`,
        input,
      ),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey:
          dashboardQueryKey(
            conferenceId,
          ),
      });
    },
  });
}

export interface AutoAssignInput {
  reviewersPerAbstract: number;
  dueDate?: string;
}

/**
 * Automatically distributes eligible abstracts
 * across active reviewers.
 */
export function useAutoAssignReviews(
  conferenceId: string,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (
      input: AutoAssignInput,
    ) =>
      apiPost<{
        assigned: number;
        skipped: number;
        reviewersAvailable: number;
        abstractsProcessed: number;
      }>(
        `conferences/${conferenceId}/review-assignments/auto`,
        input,
      ),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey:
          dashboardQueryKey(
            conferenceId,
          ),
      });
    },
  });
}

/**
 * Every assignment for an abstract,
 * including submitted review if available.
 */
export function useAbstractReviews(
  conferenceId: string,
  abstractId: string,
) {
  return useQuery({
    queryKey: [
      'conferences',
      conferenceId,
      'abstracts',
      abstractId,
      'reviews',
    ],

    queryFn: () =>
      apiGet<AbstractReviewAssignment[]>(
        `conferences/${conferenceId}/abstracts/${abstractId}/reviews`,
      ),

    enabled:
      Boolean(conferenceId) &&
      Boolean(abstractId),
  });
}

export interface ReassignReviewInput {
  assignmentId: string;
  reviewerId: string;
  dueDate?: string;
}

/**
 * Reassign an existing review assignment.
 */
export function useReassignReview(
  conferenceId: string,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      ...input
    }: ReassignReviewInput) =>
      apiPost(
        `review-assignments/${assignmentId}/reassign`,
        input,
      ),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey:
          dashboardQueryKey(
            conferenceId,
          ),
      });
    },
  });
}