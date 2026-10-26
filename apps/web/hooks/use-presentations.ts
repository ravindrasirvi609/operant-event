
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import type { PresentationAssignment } from '@/lib/program/types';

export interface PresentationWithDetails extends PresentationAssignment {
  abstract: {
    id: string;
    title: string;
    submissionNumber: string | null;
  } | null;
  speaker: PresentationAssignment['speaker'];
}

export interface AssignPresentationInput {
  abstractId?: string;
  title?: string;
  speakerId?: string | null;
  speakerName?: string;
  speakerAffiliation?: string;
  presentationType?: string;
  startTime: string;
  endTime: string;
  sortOrder?: number;
}

export interface UpdatePresentationInput {
  title?: string | null;
  speakerId?: string | null;
  speakerName?: string | null;
  speakerAffiliation?: string | null;
  presentationType?: string;
  startTime?: string;
  endTime?: string;
  sortOrder?: number;
}

function presentationsQueryKey(sessionId: string) {
  return ['sessions', sessionId, 'presentations'];
}

function presentationsInvalidationKeys(sessionId: string) {
  return [
    presentationsQueryKey(sessionId),
    ['sessions', sessionId],
  ];
}

export function useAssignPresentation(
  conferenceId: string,
  sessionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignPresentationInput) =>
      apiPost<PresentationAssignment>(
        `sessions/${sessionId}/presentations`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['conferences', conferenceId, 'sessions'],
      });

      for (const queryKey of presentationsInvalidationKeys(sessionId)) {
        void queryClient.invalidateQueries({ queryKey });
      }

      void queryClient.invalidateQueries({
        queryKey: ['conferences', conferenceId, 'program'],
      });
    },
  });
}

export function usePresentations(sessionId: string) {
  return useQuery({
    queryKey: presentationsQueryKey(sessionId),
    queryFn: () =>
      apiGet<PresentationWithDetails[]>(
        `sessions/${sessionId}/presentations`,
      ),
    enabled: Boolean(sessionId),
  });
}

export function useUpdatePresentation(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      presentationId,
      input,
    }: {
      presentationId: string;
      input: UpdatePresentationInput;
    }) =>
      apiPatch<PresentationAssignment>(
        `presentations/${presentationId}`,
        input,
      ),
    onSuccess: () => {
      for (const queryKey of presentationsInvalidationKeys(sessionId)) {
        void queryClient.invalidateQueries({ queryKey });
      }

      void queryClient.invalidateQueries({
        queryKey: ['conferences'],
      });
    },
  });
}

export function useDeletePresentation(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (presentationId: string) =>
      apiDelete(`presentations/${presentationId}`),
    onSuccess: () => {
      for (const queryKey of presentationsInvalidationKeys(sessionId)) {
        void queryClient.invalidateQueries({ queryKey });
      }

      void queryClient.invalidateQueries({
        queryKey: ['conferences'],
      });
    },
  });
}
