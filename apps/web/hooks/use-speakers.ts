'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import type { Speaker } from '@/lib/program/types';

function speakersQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'speakers'];
}

/** Organizer-only — there is no public speaker-directory endpoint; public pages only see speakers nested inside `usePublicProgram`. */
export function useSpeakers(conferenceId: string) {
  return useQuery({
    queryKey: speakersQueryKey(conferenceId),
    queryFn: () => apiGet<Speaker[]>(`conferences/${conferenceId}/speakers`),
    enabled: Boolean(conferenceId),
  });
}

export interface CreateSpeakerInput {
  userId?: string;
  name: string;
  designation?: string;
  institution?: string;
  bio?: string;
  photoFileId?: string;
  country?: string;
}

export function useCreateSpeaker(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpeakerInput) => apiPost<Speaker>(`conferences/${conferenceId}/speakers`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: speakersQueryKey(conferenceId) });
    },
  });
}

export type UpdateSpeakerInput = Partial<CreateSpeakerInput>;

export function useUpdateSpeaker(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ speakerId, input }: { speakerId: string; input: UpdateSpeakerInput }) =>
      apiPatch<Speaker>(`speakers/${speakerId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: speakersQueryKey(conferenceId) });
    },
  });
}

/**
 * The backend clears `SessionSpeaker` links and any `chairId`/`coChairId`
 * pointing at this speaker before deleting the row, so removing a speaker
 * here also changes what any session's roster/chair shows.
 */
export function useDeleteSpeaker(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (speakerId: string) => apiDelete(`speakers/${speakerId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: speakersQueryKey(conferenceId) });
      void queryClient.invalidateQueries({ queryKey: ['conferences', conferenceId, 'sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['conferences', conferenceId, 'program'] });
    },
  });
}
