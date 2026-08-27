'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import type { PresentationAssignment } from '@/lib/program/types';

export interface AssignPresentationInput {
  abstractId: string;
  presentationType?: string;
  startTime: string;
  endTime: string;
  sortOrder?: number;
}

function presentationsInvalidationKeys(sessionId: string) {
  return [presentationsQueryKey(sessionId), ['sessions', sessionId]];
}

function presentationsQueryKey(sessionId: string) {
  return ['sessions', sessionId, 'presentations'];
}

/**
 * The backend enforces `abstract.status === 'ACCEPTED'` (400 otherwise),
 * that the window falls inside the session's own window (400), and that
 * the same abstract isn't already scheduled elsewhere with an overlapping
 * time (409) — all server-side; this hook does not duplicate that logic,
 * only surfaces the resulting error.
 */
export function useAssignPresentation(conferenceId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignPresentationInput) =>
      apiPost<PresentationAssignment>(`sessions/${sessionId}/presentations`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conferences', conferenceId, 'sessions'] });
      for (const queryKey of presentationsInvalidationKeys(sessionId)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

/** `GET sessions/:sessionId/presentations`, ordered by `sortOrder`, each row including its `abstract`. */
export function usePresentations(sessionId: string) {
  return useQuery({
    queryKey: presentationsQueryKey(sessionId),
    queryFn: () =>
      apiGet<(PresentationAssignment & { abstract: { title: string; submissionNumber: string | null } })[]>(
        `sessions/${sessionId}/presentations`,
      ),
    enabled: Boolean(sessionId),
  });
}

export interface UpdatePresentationInput {
  presentationType?: string;
  startTime?: string;
  endTime?: string;
  sortOrder?: number;
}

/** Re-runs the same within-session-window and no-double-booking checks `assign` does — abstractId/sessionId can't be changed, only re-timed. */
export function useUpdatePresentation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ presentationId, input }: { presentationId: string; input: UpdatePresentationInput }) =>
      apiPatch<PresentationAssignment>(`presentations/${presentationId}`, input),
    onSuccess: () => {
      for (const queryKey of presentationsInvalidationKeys(sessionId)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useDeletePresentation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (presentationId: string) => apiDelete(`presentations/${presentationId}`),
    onSuccess: () => {
      for (const queryKey of presentationsInvalidationKeys(sessionId)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
