'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, apiPut } from '@/lib/api/client';
import type { ProgramSession, PublicProgramSession, SpeakerRole } from '@/lib/program/types';

function sessionsQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'sessions'];
}

/** Organizer-facing: all statuses, no `speakers`/`presentations` include — only the public route embeds those. */
export function useSessions(conferenceId: string) {
  return useQuery({
    queryKey: sessionsQueryKey(conferenceId),
    queryFn: () => apiGet<ProgramSession[]>(`conferences/${conferenceId}/sessions`),
    enabled: Boolean(conferenceId),
  });
}

/** Public, no auth — full rows including `speakers`/`presentations`, PUBLISHED only. */
export function usePublicProgram(conferenceId: string) {
  return useQuery({
    queryKey: ['conferences', conferenceId, 'program'],
    queryFn: () => apiGet<PublicProgramSession[]>(`conferences/${conferenceId}/program`),
    enabled: Boolean(conferenceId),
  });
}

function sessionDetailQueryKey(sessionId: string) {
  return ['sessions', sessionId];
}

/** Organizer-facing single session — `GET sessions/:id`, includes `speakers`/`presentations` regardless of status. */
export function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: sessionDetailQueryKey(sessionId),
    queryFn: () => apiGet<PublicProgramSession>(`sessions/${sessionId}`),
    enabled: Boolean(sessionId),
  });
}

export interface SessionFormInput {
  trackId?: string;
  title: string;
  description?: string;
  room?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  sessionType?: string;
}

export function useCreateSession(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionFormInput) => apiPost<ProgramSession>(`conferences/${conferenceId}/sessions`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionsQueryKey(conferenceId) });
    },
  });
}

export function useUpdateSession(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, input }: { sessionId: string; input: Partial<SessionFormInput> }) =>
      apiPatch<ProgramSession>(`sessions/${sessionId}`, input),
    onSuccess: (_, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: sessionsQueryKey(conferenceId) });
      void queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    },
  });
}

/** No request body — publishing is a pure status flip, not an edit. */
export function usePublishSession(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => apiPost<ProgramSession>(`sessions/${sessionId}/publish`),
    onSuccess: (_, sessionId) => {
      void queryClient.invalidateQueries({ queryKey: sessionsQueryKey(conferenceId) });
      void queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    },
  });
}

/** An empty `assignments` array is valid and clears every speaker on the session — not a no-op. */
export function useAssignSpeakers(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, assignments }: { sessionId: string; assignments: { speakerId: string; role: SpeakerRole }[] }) =>
      apiPut(`sessions/${sessionId}/speakers`, { assignments }),
    onSuccess: (_, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: sessionsQueryKey(conferenceId) });
      void queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    },
  });
}
