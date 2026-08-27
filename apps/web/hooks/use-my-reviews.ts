'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { ReviewAssignmentProjection, ReviewRecommendation } from '@/lib/reviewers/types';

const MY_REVIEWS_QUERY_KEY = ['review-assignments', 'mine'];

export function useMyReviewAssignments() {
  return useQuery({
    queryKey: MY_REVIEWS_QUERY_KEY,
    queryFn: () => apiGet<ReviewAssignmentProjection[]>('review-assignments/mine'),
  });
}

/** No `GET review-assignments/:id` for reviewers either — derived from the same `mine` list, same pattern as every other "single item, no direct endpoint" case in this app. */
export function useMyReviewAssignment(assignmentId: string) {
  return useQuery({
    queryKey: MY_REVIEWS_QUERY_KEY,
    queryFn: () => apiGet<ReviewAssignmentProjection[]>('review-assignments/mine'),
    select: (assignments) => assignments.find((assignment) => assignment.id === assignmentId),
  });
}

export function useDeclineAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => apiPost(`review-assignments/${assignmentId}/decline`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useDeclareConflict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => apiPost(`review-assignments/${assignmentId}/declare-conflict`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_REVIEWS_QUERY_KEY });
    },
  });
}

export interface SubmitReviewInput {
  overallScore: number;
  originalityScore: number;
  methodologyScore: number;
  significanceScore: number;
  presentationScore: number;
  commentsToAuthor?: string;
  privateComments?: string;
  recommendation: ReviewRecommendation;
}

export function useSubmitReview(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitReviewInput) => apiPost(`review-assignments/${assignmentId}/review`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_REVIEWS_QUERY_KEY });
    },
  });
}
