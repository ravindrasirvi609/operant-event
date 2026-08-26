'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import type { Conference, ConferenceStatus } from '@/lib/conferences/types';

const CONFERENCES_QUERY_KEY = ['conferences'];

function conferenceQueryKey(conferenceId: string) {
  return ['conferences', conferenceId];
}

export function useConferences() {
  return useQuery({
    queryKey: CONFERENCES_QUERY_KEY,
    queryFn: () => apiGet<Conference[]>('conferences'),
  });
}

export function useConference(conferenceId: string) {
  return useQuery({
    queryKey: conferenceQueryKey(conferenceId),
    queryFn: () => apiGet<Conference>(`conferences/${conferenceId}`),
    enabled: Boolean(conferenceId),
  });
}

export interface ConferenceFormInput {
  name: string;
  shortName?: string;
  description?: string;
  startDate: string;
  endDate: string;
  timezone: string;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  country?: string;
  website?: string;
  contactEmail?: string;
}

export function useCreateConference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConferenceFormInput) => apiPost<Conference>('conferences', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONFERENCES_QUERY_KEY });
    },
  });
}

export function useUpdateConference(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ConferenceFormInput>) => apiPatch<Conference>(`conferences/${conferenceId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conferenceQueryKey(conferenceId) });
      void queryClient.invalidateQueries({ queryKey: CONFERENCES_QUERY_KEY });
    },
  });
}

export function useChangeConferenceStatus(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: ConferenceStatus) =>
      apiPatch<Conference>(`conferences/${conferenceId}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conferenceQueryKey(conferenceId) });
      void queryClient.invalidateQueries({ queryKey: CONFERENCES_QUERY_KEY });
    },
  });
}

export function usePublishConference(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<Conference>(`conferences/${conferenceId}/publish`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conferenceQueryKey(conferenceId) });
      void queryClient.invalidateQueries({ queryKey: CONFERENCES_QUERY_KEY });
    },
  });
}
