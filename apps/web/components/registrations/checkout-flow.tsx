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
 * That's only partially possible here: there is no `GET
 * orders/:orderId` or `GET registrations/:registrationId/orders`
 * endpoint, so once an order exists, the frontend has no way to look it
 * up again except the sessionStorage cache written right after creation
 * (see `lib/registrations/order-cache.ts`). A refresh in the *same*
 * browser tab resumes correctly; a refresh after clearing storage, or
 * from a different device, does not — the order still exists
 * server-side, but nothing here can display it. That case is disclosed
 * below rather than silently treated as "no order yet."
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
        <Link
          href={`/orders/${orderResult.order.id}?registrationId=${registrationId}`}
          className="text-sm text-muted-foreground underline"
        >
          View order status
        </Link>
      </div>
    );
  }

  if (conflict) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
        An order already exists for this registration, but it can&apos;t be redisplayed from here — no endpoint
        exists yet to look up an existing order. Check your email for a gateway confirmation, or contact the
        organizer with your registration number for manual payment status.
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
