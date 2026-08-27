'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
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

/** Create-only — there is no update/delete endpoint; a speaker's own record is immutable once created. */
export function useCreateSpeaker(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpeakerInput) => apiPost<Speaker>(`conferences/${conferenceId}/speakers`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: speakersQueryKey(conferenceId) });
    },
  });
}
