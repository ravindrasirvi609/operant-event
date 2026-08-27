'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import type { Invoice } from '@/lib/registrations/types';

/** `GET orders/:orderId/invoice` — `JwtAuthGuard` only, returns `order.invoice` directly (or `null`). */
export function useInvoice(orderId: string) {
  return useQuery({
    queryKey: ['orders', orderId, 'invoice'],
    queryFn: () => apiGet<Invoice | null>(`orders/${orderId}/invoice`),
    enabled: Boolean(orderId),
  });
}

/** `GET orders/:orderId/invoice/organizer` — header + `PAYMENT_MANAGE`. */
export function useOrganizerInvoice(orderId: string) {
  return useQuery({
    queryKey: ['orders', orderId, 'invoice', 'organizer'],
    queryFn: () => apiGet<Invoice | null>(`orders/${orderId}/invoice/organizer`),
    enabled: Boolean(orderId),
  });
}
