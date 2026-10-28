
'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiGet, apiPut } from '@/lib/api/client';

import type {
  CertificateTemplateFieldPositions,
  ConferenceSetting,
  ReviewMode,
} from '@/lib/conferences/types';

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

  certificateTemplateFileId: null,
  certificateTemplateMimeType: null,
  certificateTemplateUpdatedAt: null,
  certificateTemplateFieldPositions: null,
};

/**
 * Loads conference settings.
 * If settings have not been created yet, returns frontend defaults.
 */
export function useConferenceSettings(conferenceId: string) {
  return useQuery({
    queryKey: settingsQueryKey(conferenceId),
    queryFn: async () => {
      const settings = await apiGet<ConferenceSetting | null>(
        `conferences/${encodeURIComponent(conferenceId)}/settings`,
      );

      return settings ?? {
        conferenceId,
        ...DEFAULT_SETTINGS,
      };
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

  certificateTemplateFieldPositions?: CertificateTemplateFieldPositions;
}

export function useUpdateConferenceSettings(conferenceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateConferenceSettingsInput) =>
      apiPut<ConferenceSetting>(
        `conferences/${encodeURIComponent(conferenceId)}/settings`,
        input,
      ),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsQueryKey(conferenceId),
      });
    },
  });
}
