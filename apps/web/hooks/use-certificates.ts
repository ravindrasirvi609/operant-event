
'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api/client';

import type {
  Certificate,
  CertificateVerification,
  CertificateWithRegistration,
  MyCertificate,
} from '@/lib/certificates/types';

function certificatesInvalidationKey(conferenceId: string) {
  return ['conferences', conferenceId, 'certificates'];
}

export interface ConferenceFeedback {
  id: string;
  conferenceId: string;
  userId: string;
  rating: number;
  contentRating: string;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitConferenceFeedbackInput {
  rating: number;
  contentRating: 'Excellent' | 'Good' | 'Average' | 'Needs improvement';
  comments?: string;
}

export function useMyCertificates() {
  return useQuery({
    queryKey: ['certificates', 'mine'],
    queryFn: () => apiGet<MyCertificate[]>('certificates/mine'),
  });
}

export function useMyConferenceFeedback(conferenceId: string) {
  return useQuery({
    queryKey: ['conference-feedback', 'mine', conferenceId],
    queryFn: () =>
      apiGet<ConferenceFeedback | null>(
        `conferences/${conferenceId}/feedback/mine`,
      ),
    enabled: Boolean(conferenceId),
  });
}

export function useSubmitConferenceFeedback(conferenceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitConferenceFeedbackInput) =>
      apiPost<ConferenceFeedback>(
        `conferences/${conferenceId}/feedback`,
        input,
      ),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['conference-feedback', 'mine', conferenceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['certificates', 'mine'],
        }),
      ]);
    },
  });
}

export function useConferenceCertificates(conferenceId: string) {
  return useQuery({
    queryKey: certificatesInvalidationKey(conferenceId),
    queryFn: () =>
      apiGet<CertificateWithRegistration[]>(
        `conferences/${conferenceId}/certificates`,
      ),
    enabled: Boolean(conferenceId),
  });
}

export function useGenerateCertificates(conferenceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiPost<Certificate[]>(
        `conferences/${conferenceId}/certificates/generate`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: certificatesInvalidationKey(conferenceId),
      });
    },
  });
}

export function useIssueCertificate(conferenceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (certificateId: string) =>
      apiPost<Certificate>(`certificates/${certificateId}/issue`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: certificatesInvalidationKey(conferenceId),
      });
    },
  });
}

export function useRevokeCertificate(conferenceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (certificateId: string) =>
      apiPost<Certificate>(`certificates/${certificateId}/revoke`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: certificatesInvalidationKey(conferenceId),
      });
    },
  });
}

export function useCertificate(certificateId: string) {
  return useQuery({
    queryKey: ['certificates', certificateId],
    queryFn: () => apiGet<Certificate>(`certificates/${certificateId}`),
    enabled: Boolean(certificateId),
  });
}

export function useOrganizerCertificate(certificateId: string) {
  return useQuery({
    queryKey: ['certificates', certificateId, 'organizer'],
    queryFn: () =>
      apiGet<CertificateWithRegistration>(
        `certificates/${certificateId}/organizer`,
      ),
    enabled: Boolean(certificateId),
  });
}

export function useVerifyCertificate(code: string) {
  return useQuery({
    queryKey: ['certificates', 'verify', code],
    queryFn: () =>
      apiGet<CertificateVerification>(`certificates/verify/${code}`),
    enabled: Boolean(code),
    retry: false,
  });
}
