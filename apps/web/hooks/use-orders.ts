'use client';

import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api/client';
import type { CreateOrderResult } from '@/lib/registrations/types';

/**
 * `OrdersController` runs `JwtAuthGuard` only, no org header. The result
 * is the source of truth for which payment mode is active for this
 * order — see `resolvePaymentBranch`.
 */
export function useCreateOrder(registrationId: string) {
  return useMutation({
    mutationFn: (provider?: string) =>
      apiPost<CreateOrderResult>(`registrations/${registrationId}/orders`, provider ? { provider } : undefined),
  });
}
