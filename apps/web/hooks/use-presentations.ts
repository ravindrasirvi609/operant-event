'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api/client';
import type { PresentationAssignment } from '@/lib/program/types';

export interface AssignPresentationInput {
  abstractId: string;
  presentationType?: string;
  startTime: string;
  endTime: string;
  sortOrder?: number;
}

/**
 * Assign-only — there is no list/update/delete endpoint for
 * presentations. The backend enforces `abstract.status === 'ACCEPTED'`
 * (400 otherwise), that the window falls inside the session's own
 * window (400), and that the same abstract isn't already scheduled
 * elsewhere with an overlapping time (409) — all server-side; this
 * hook does not duplicate that logic, only surfaces the resulting error.
 */
export function useAssignPresentation(conferenceId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignPresentationInput) =>
      apiPost<PresentationAssignment>(`sessions/${sessionId}/presentations`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conferences', conferenceId, 'sessions'] });
    },
  });
}
