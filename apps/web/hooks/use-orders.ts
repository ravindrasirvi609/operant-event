
'use client';

import {
  useMutation,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api/client';
import type {
  CreateOrderResult,
  Order,
} from '@/lib/registrations/types';

/**
 * Existing order returned by the registration orders endpoint.
 */
export interface ExistingRegistrationOrder {
  order: Order;
  paymentMode: 'GATEWAY' | 'MANUAL';
  manualPaymentInstructions?: string;
}

/**
 * Fetch an existing order for the current user's registration.
 * Returns null when the registration has no order yet.
 */

export interface ExistingRegistrationOrder {
  order: Order;
  paymentMode: 'GATEWAY' | 'MANUAL';
  manualPaymentInstructions?: string;
}

export function useRegistrationOrder(registrationId: string) {
  return useQuery({
    queryKey: ['registrations', registrationId, 'order'],
    queryFn: () =>
      apiGet<ExistingRegistrationOrder | null>(
        `registrations/${registrationId}/orders`,
      ),
    enabled: Boolean(registrationId),
    retry: 1,
  });
}


/**
 * Create an order for a registration.
 */
export function useCreateOrder(registrationId: string) {
  return useMutation({
    mutationFn: (provider?: string) =>
      apiPost<CreateOrderResult>(
        `registrations/${registrationId}/orders`,
        provider ? { provider } : undefined,
      ),
  });
}

/**
 * Fetch an order owned by the authenticated user.
 */
export function useOrder(
  orderId: string,
  options?: Partial<UseQueryOptions<Order>>,
) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => apiGet<Order>(`orders/${orderId}`),
    enabled: Boolean(orderId),
    ...options,
  });
}

/**
 * Fetch conference orders for an organizer.
 */
export function useConferenceOrders(
  conferenceId: string,
  status?: string,
) {
  return useQuery({
    queryKey: ['conferences', conferenceId, 'orders', status ?? 'all'],
    queryFn: () =>
      apiGet<Order[]>(
        `conferences/${conferenceId}/orders${
          status ? `?status=${status}` : ''
        }`,
      ),
    enabled: Boolean(conferenceId),
  });
}
