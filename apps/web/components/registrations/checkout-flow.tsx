'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentModeBranch } from '@/components/registrations/payment-mode-branch';
import { ApiError } from '@/lib/api/backend';
import { useCreateOrder } from '@/hooks/use-orders';
import { cacheOrderResult } from '@/lib/registrations/order-cache';
import { useCachedOrderResult } from '@/lib/registrations/use-cached-order-result';
import type { CreateOrderResult } from '@/lib/registrations/types';

/**
 * SRS §35 requires checkout to survive a hard refresh from server state.
 * `GET orders/:orderId` now exists, so once the order id is known, its
 * status/invoice resume correctly from the server (see
 * `<OrderStatusView>`). What's still missing is a `GET
 * registrations/:registrationId/orders` — there is no way to look up an
 * *existing* order's id from just a registration id, so the order id
 * itself is only ever known from the create response, cached client-side
 * (`lib/registrations/order-cache.ts`) as a same-tab mitigation. A
 * refresh after clearing storage, or from a different device, loses the
 * id (not the order, which still exists) — disclosed below rather than
 * silently treated as "no order yet."
 */
export function CheckoutFlow({ registrationId }: { registrationId: string }) {
  const cachedOrderResult = useCachedOrderResult(registrationId);
  const [createdOrderResult, setCreatedOrderResult] = useState<CreateOrderResult | null>(null);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createOrder = useCreateOrder(registrationId);
  const orderResult = createdOrderResult ?? cachedOrderResult;

  async function handlePayNow() {
    setError(null);
    setConflict(false);
    try {
      const result = await createOrder.mutateAsync(undefined);
      cacheOrderResult(registrationId, result);
      setCreatedOrderResult(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflict(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start checkout.');
      }
    }
  }

  if (orderResult) {
    return (
      <div className="space-y-4">
        <PaymentModeBranch orderResult={orderResult} orderId={orderResult.order.id} />
        <Link href={`/orders/${orderResult.order.id}`} className="text-sm text-muted-foreground underline">
          View order status
        </Link>
      </div>
    );
  }

  if (conflict) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
        An order already exists for this registration, but its id isn&apos;t known here anymore — there is no
        endpoint to look up an order by registration id, only by its own id. Check your email for a gateway
        confirmation, or contact the organizer with your registration number for manual payment status.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button disabled={createOrder.isPending} onClick={handlePayNow}>
        {createOrder.isPending ? 'Starting checkout…' : 'Pay now'}
      </Button>
    </div>
  );
}
