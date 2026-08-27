'use client';

import { useMutation, useQuery, type UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { CheckinResult, CheckinType, CheckinWithRegistration } from '@/lib/checkin/types';

export interface CheckinInput {
  conferenceId: string;
  qrCode?: string;
  registrationNumber?: string;
  email?: string;
  checkinType: CheckinType;
  sessionId?: string;
  allowReentry?: boolean;
  deviceId?: string;
}

/**
 * `reused: true` in the response means this was a no-op re-scan (200,
 * not an error) — the UI must render that as a visible-but-calm state
 * ("already checked in"), never as a failure toast.
 */
export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckinInput) => apiPost<CheckinResult>('checkins', input),
    onSuccess: (_, input) => {
      void queryClient.invalidateQueries({ queryKey: ['conferences', input.conferenceId, 'checkins'] });
      void queryClient.invalidateQueries({ queryKey: ['conferences', input.conferenceId, 'attendance'] });
    },
  });
}

/**
 * A flat list of every check-in, each with the embedded `registration`
 * row — there is no aggregate-counts endpoint, so any "N checked in"
 * stat is derived client-side from this list's length (see
 * `<CheckinDashboard>`), not fetched pre-computed.
 */
export function useCheckinDashboard(
  conferenceId: string,
  options?: Partial<UseQueryOptions<CheckinWithRegistration[]>>,
) {
  return useQuery({
    queryKey: ['conferences', conferenceId, 'checkins'],
    queryFn: () => apiGet<CheckinWithRegistration[]>(`conferences/${conferenceId}/checkins`),
    enabled: Boolean(conferenceId),
    ...options,
  });
}
