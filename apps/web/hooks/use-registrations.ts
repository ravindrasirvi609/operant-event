'use client';

import { useMutation, useQuery, type UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { Registration } from '@/lib/registrations/types';

function registrationQueryKey(registrationId: string) {
  return ['registrations', registrationId];
}

/**
 * `RegistrationsController` runs `JwtAuthGuard` only — same reasoning as
 * `AbstractsController`: a registrant has no organization context.
 */
export function useRegistration(
  registrationId: string,
  options?: Partial<UseQueryOptions<Registration>>,
) {
  return useQuery({
    queryKey: registrationQueryKey(registrationId),
    queryFn: () => apiGet<Registration>(`registrations/${registrationId}`),
    enabled: Boolean(registrationId),
    ...options,
  });
}

/**
 * `RegisterDto` is `{ categoryId }` only — the server resolves the
 * currently-effective pricing window and its price/currency itself.
 * Callers must never compute or send a price client-side, and must treat
 * the returned `Registration.totalAmount`/`currency` as the first
 * trustworthy price the user sees.
 */
export function useRegister(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      apiPost<Registration>(`conferences/${conferenceId}/registrations`, { categoryId }),
    onSuccess: (registration) => {
      queryClient.setQueryData(registrationQueryKey(registration.id), registration);
    },
  });
}
