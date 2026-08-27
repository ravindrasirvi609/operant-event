'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api/client';
import type { Payment } from '@/lib/registrations/types';

export interface SubmitManualPaymentProofInput {
  reference?: string;
  proofFileId?: string;
}

/** `PaymentsController`'s proof-submission route runs `JwtAuthGuard` only, no org header. */
export function useSubmitManualPaymentProof(orderId: string) {
  return useMutation({
    mutationFn: (input: SubmitManualPaymentProofInput) =>
      apiPost<Payment>(`orders/${orderId}/payment-proof`, input),
  });
}

/**
 * `approveManualPayment` is typed `Promise<void>` on the backend and
 * sends no body — the empty-body 201 response is normalized to
 * `undefined` by `parseApiResponse`.
 */
export function useApproveManualPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => apiPost<void>(`orders/${orderId}/approve-payment`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
}

/**
 * Asymmetric with approve on the backend: `rejectManualPayment` returns
 * the updated `Payment` row (status `FAILED`), not void.
 */
export function useRejectManualPayment() {
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      apiPost<Payment>(`orders/${orderId}/reject-payment`, reason ? { reason } : undefined),
  });
}

/** `refund` is typed `Promise<void>` and sends no body, same empty-201 shape as approve. */
export function useRefundPayment() {
  return useMutation({
    mutationFn: (orderId: string) => apiPost<void>(`orders/${orderId}/refund`),
  });
}
