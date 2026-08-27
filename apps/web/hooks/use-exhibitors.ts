'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import type { Exhibitor } from '@/lib/exhibitors/types';
import type { SponsorPaymentStatus } from '@/lib/sponsors/types';

function exhibitorsQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'exhibitors'];
}

/** The list response already embeds each exhibitor's `staff` array — no separate staff-list call needed. */
export function useExhibitors(conferenceId: string) {
  return useQuery({
    queryKey: exhibitorsQueryKey(conferenceId),
    queryFn: () => apiGet<Exhibitor[]>(`conferences/${conferenceId}/exhibitors`),
    enabled: Boolean(conferenceId),
  });
}

export interface CreateExhibitorInput {
  companyName: string;
  boothNumber?: string;
  contactPerson?: string;
}

export function useCreateExhibitor(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExhibitorInput) => apiPost<Exhibitor>(`conferences/${conferenceId}/exhibitors`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exhibitorsQueryKey(conferenceId) });
    },
  });
}

export interface UpdateExhibitorInput extends Partial<CreateExhibitorInput> {
  paymentStatus?: SponsorPaymentStatus;
}

/** Not conference-nested on the backend — `PATCH exhibitors/:id`, unlike sponsors' `PATCH conferences/:conferenceId/sponsors/:id`. */
export function useUpdateExhibitor(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitorId, input }: { exhibitorId: string; input: UpdateExhibitorInput }) =>
      apiPatch<Exhibitor>(`exhibitors/${exhibitorId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exhibitorsQueryKey(conferenceId) });
    },
  });
}

export function useAddExhibitorStaff(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitorId, name, email }: { exhibitorId: string; name: string; email?: string }) =>
      apiPost(`exhibitors/${exhibitorId}/staff`, { name, email }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exhibitorsQueryKey(conferenceId) });
    },
  });
}

/** Top-level `exhibitor-staff/:staffId` — not nested under the exhibitor. */
export function useRemoveExhibitorStaff(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string) => apiDelete(`exhibitor-staff/${staffId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exhibitorsQueryKey(conferenceId) });
    },
  });
}
