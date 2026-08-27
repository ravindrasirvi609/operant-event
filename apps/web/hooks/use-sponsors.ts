'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import type { Sponsor, SponsorPaymentStatus, SponsorTier } from '@/lib/sponsors/types';

function sponsorsQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'sponsors'];
}

/** No separate read permission — a caller without SPONSOR_MANAGE cannot list sponsors at all, not even read-only. */
export function useSponsors(conferenceId: string) {
  return useQuery({
    queryKey: sponsorsQueryKey(conferenceId),
    queryFn: () => apiGet<Sponsor[]>(`conferences/${conferenceId}/sponsors`),
    enabled: Boolean(conferenceId),
  });
}

export interface CreateSponsorInput {
  name: string;
  tier: SponsorTier;
  contactName?: string;
  contactEmail?: string;
  logoFileId?: string;
}

/** `paymentStatus` cannot be set on create — it's always PENDING at creation, only PATCH can change it. */
export function useCreateSponsor(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSponsorInput) => apiPost<Sponsor>(`conferences/${conferenceId}/sponsors`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sponsorsQueryKey(conferenceId) });
    },
  });
}

export interface UpdateSponsorInput extends Partial<CreateSponsorInput> {
  paymentStatus?: SponsorPaymentStatus;
}

export function useUpdateSponsor(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sponsorId, input }: { sponsorId: string; input: UpdateSponsorInput }) =>
      apiPatch<Sponsor>(`conferences/${conferenceId}/sponsors/${sponsorId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sponsorsQueryKey(conferenceId) });
    },
  });
}

export function useDeleteSponsor(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sponsorId: string) => apiDelete(`conferences/${conferenceId}/sponsors/${sponsorId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sponsorsQueryKey(conferenceId) });
    },
  });
}
