'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '@/lib/api/client';
import type { ConferenceSetting, ReviewMode } from '@/lib/conferences/types';

function settingsQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'settings'];
}

const DEFAULT_SETTINGS: Omit<ConferenceSetting, 'conferenceId'> = {
  abstractEnabled: false,
  abstractStartDate: null,
  abstractEndDate: null,
  reviewEnabled: false,
  reviewMode: 'SINGLE_BLIND',
  registrationEnabled: false,
  registrationStartDate: null,
  registrationEndDate: null,
  paymentEnabled: false,
  paymentMode: 'MANUAL',
  manualPaymentInstructions: null,
  certificateEnabled: false,
  checkinEnabled: false,
};

/**
 * `GET .../settings` returns `null` (200, not 404) for a conference that
 * has never had its settings saved — `upsert` is how the backend models
 * "first save" too, so the frontend just fills in the same defaults the
 * Prisma model itself defaults to, rather than showing a separate
 * empty/create state before the same form.
 */
export function useConferenceSettings(conferenceId: string) {
  return useQuery({
    queryKey: settingsQueryKey(conferenceId),
    queryFn: async () => {
      const settings = await apiGet<ConferenceSetting | null>(`conferences/${conferenceId}/settings`);
      return settings ?? { conferenceId, ...DEFAULT_SETTINGS };
    },
    enabled: Boolean(conferenceId),
  });
}

export interface UpdateConferenceSettingsInput {
  abstractEnabled?: boolean;
  abstractStartDate?: string;
  abstractEndDate?: string;
  reviewEnabled?: boolean;
  reviewMode?: ReviewMode;
  registrationEnabled?: boolean;
  registrationStartDate?: string;
  registrationEndDate?: string;
  paymentEnabled?: boolean;
  manualPaymentInstructions?: string;
  certificateEnabled?: boolean;
  checkinEnabled?: boolean;
}

export function useUpdateConferenceSettings(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateConferenceSettingsInput) =>
      apiPut<ConferenceSetting>(`conferences/${conferenceId}/settings`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey(conferenceId) });
    },
  });
}
