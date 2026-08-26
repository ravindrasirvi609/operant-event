'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, apiPut } from '@/lib/api/client';
import type { ConferenceTrack } from '@/lib/conferences/types';

function tracksQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'tracks'];
}

export function useTracks(conferenceId: string) {
  return useQuery({
    queryKey: tracksQueryKey(conferenceId),
    queryFn: () => apiGet<ConferenceTrack[]>(`conferences/${conferenceId}/tracks`),
    enabled: Boolean(conferenceId),
  });
}

export interface TrackFormInput {
  name: string;
  code?: string;
  description?: string;
}

export function useCreateTrack(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TrackFormInput) =>
      apiPost<ConferenceTrack>(`conferences/${conferenceId}/tracks`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tracksQueryKey(conferenceId) });
    },
  });
}

export function useUpdateTrack(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ trackId, input }: { trackId: string; input: Partial<TrackFormInput> & { status?: string } }) =>
      apiPatch<ConferenceTrack>(`conferences/${conferenceId}/tracks/${trackId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tracksQueryKey(conferenceId) });
    },
  });
}

export function useReorderTracks(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trackIds: string[]) =>
      apiPut<ConferenceTrack[]>(`conferences/${conferenceId}/tracks/reorder`, { trackIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tracksQueryKey(conferenceId) });
    },
  });
}
