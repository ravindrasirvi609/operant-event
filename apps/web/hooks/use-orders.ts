'use client';

import { useMutation, useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { CreateOrderResult, Order } from '@/lib/registrations/types';

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

/** Owner-facing: `GET orders/:orderId`, `JwtAuthGuard` only, ownership checked via the registration relation. */
export function useOrder(orderId: string, options?: Partial<UseQueryOptions<Order>>) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => apiGet<Order>(`orders/${orderId}`),
    enabled: Boolean(orderId),
    ...options,
  });
}

/** Organizer-facing: lists orders for a conference, optionally filtered by status — fixes the pending-payments queue gap. */
export function useConferenceOrders(conferenceId: string, status?: string) {
  return useQuery({
    queryKey: ['conferences', conferenceId, 'orders', status ?? 'all'],
    queryFn: () =>
      apiGet<Order[]>(`conferences/${conferenceId}/orders${status ? `?status=${status}` : ''}`),
    enabled: Boolean(conferenceId),
  });
}
