'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { Certificate, CertificateVerification, CertificateWithRegistration } from '@/lib/certificates/types';

function certificatesInvalidationKey(conferenceId: string) {
  return ['conferences', conferenceId, 'certificates'];
}

/** Runs the full eligibility sweep synchronously and returns only the newly-created ELIGIBLE rows (not every certificate for the conference). */
export function useGenerateCertificates(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<Certificate[]>(`conferences/${conferenceId}/certificates/generate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: certificatesInvalidationKey(conferenceId) });
    },
  });
}

/** Skips PDF rendering entirely and transitions straight to ISSUED — GENERATED is never produced by the backend today. */
export function useIssueCertificate(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (certificateId: string) => apiPost<Certificate>(`certificates/${certificateId}/issue`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: certificatesInvalidationKey(conferenceId) });
    },
  });
}

/** Owner-facing: bare Certificate row, no `registration`/`conference` include, scoped by `registration.userId === caller.id`. */
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
    queryFn: () => apiGet<CertificateWithRegistration>(`certificates/${certificateId}/organizer`),
    enabled: Boolean(certificateId),
  });
}

/**
 * Public, no auth — this exact 6-field shape is the entire response.
 * 404s identically for "wrong code," "not yet issued," and "revoked" —
 * there is no way to distinguish those cases from this endpoint alone.
 */
export function useVerifyCertificate(code: string) {
  return useQuery({
    queryKey: ['certificates', 'verify', code],
    queryFn: () => apiGet<CertificateVerification>(`certificates/verify/${code}`),
    enabled: Boolean(code),
    retry: false,
  });
}
