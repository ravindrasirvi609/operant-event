
'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { PaymentModeBranch } from '@/components/registrations/payment-mode-branch';
import { ApiError } from '@/lib/api/backend';
import {
  useCreateOrder,
  useRegistrationOrder,
} from '@/hooks/use-orders';
import { useRegistration } from '@/hooks/use-registrations';
import { cacheOrderResult } from '@/lib/registrations/order-cache';
import { useCachedOrderResult } from '@/lib/registrations/use-cached-order-result';
import type { CreateOrderResult } from '@/lib/registrations/types';

export function CheckoutFlow({
  registrationId,
}: {
  registrationId: string;
}) {
  const registrationQuery = useRegistration(registrationId);
  const registration = registrationQuery.data;

  const existingOrderQuery = useRegistrationOrder(registrationId);
  const existingOrderData = existingOrderQuery.data;

  const cachedOrderResult = useCachedOrderResult(registrationId);

  const [createdOrderResult, setCreatedOrderResult] =
    useState<CreateOrderResult | null>(null);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCreateOrder(registrationId);
  const orderResult = createdOrderResult ?? cachedOrderResult;

  async function handlePayNow() {
    if (
      createOrder.isPending ||
      existingOrderQuery.isPending ||
      existingOrderQuery.isError ||
      existingOrderData
    ) {
      return;
    }

    setError(null);
    setConflict(false);

    try {
      const result = await createOrder.mutateAsync(undefined);

      cacheOrderResult(registrationId, result);
      setCreatedOrderResult(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflict(true);
        await existingOrderQuery.refetch();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to start checkout.',
        );
      }
    }
  }

  const registrationDetails = registration ? (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <p className="text-sm text-muted-foreground">
        Registration number
      </p>

      <p className="mt-1 font-semibold">
        {registration.registrationNumber}
      </p>

      <div className="mt-4 flex items-center justify-between gap-4 border-t pt-4">
        <span className="text-sm text-muted-foreground">
          Amount payable
        </span>

        <span className="text-lg font-semibold">
          {registration.currency === 'INR' ? '₹' : ''}
          {Number(registration.totalAmount).toLocaleString('en-IN')}{' '}
          {registration.currency}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        The payable amount is taken from your registration details.
      </p>
    </section>
  ) : registrationQuery.isPending ? (
    <div className="rounded-xl border p-4 text-sm text-muted-foreground">
      Loading registration details…
    </div>
  ) : registrationQuery.isError ? (
    <p role="alert" className="text-sm text-destructive">
      Could not load registration details. Please refresh the page or try again.
    </p>
  ) : null;

  if (registration?.status === 'CONFIRMED') {
    return (
      <div className="space-y-4 rounded-xl border p-5">
        <h2 className="font-semibold">Registration confirmed</h2>

        <p className="text-sm text-muted-foreground">
          Your payment has been confirmed. You do not need to start checkout again.
        </p>

        <Link
          href={`/registrations/${registration.id}`}
          className="text-sm underline"
        >
          View registration and QR code
        </Link>
      </div>
    );
  }

  if (orderResult) {
    return (
      <div className="space-y-4">
        {registrationDetails}

        <PaymentModeBranch
          orderResult={orderResult}
          orderId={orderResult.order.id}
          manualInstructionsText={orderResult.manualPaymentInstructions}
        />

        <Link
          href={`/orders/${orderResult.order.id}`}
          className="text-sm text-muted-foreground underline"
        >
          View order status
        </Link>
      </div>
    );
  }

  if (existingOrderQuery.isPending) {
    return (
      <div className="space-y-4">
        {registrationDetails}
        <p className="text-sm text-muted-foreground">
          Checking for an existing order…
        </p>
      </div>
    );
  }

  if (existingOrderQuery.isError) {
    return (
      <div className="space-y-4">
        {registrationDetails}
        <p role="alert" className="text-sm text-destructive">
          Could not check for an existing order. Refresh the page and try again.
        </p>
        <Button
          variant="outline"
          onClick={() => existingOrderQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (existingOrderData?.order) {
    const { order, paymentMode, manualPaymentInstructions } =
      existingOrderData;

    if (paymentMode === 'MANUAL') {
      return (
        <div className="space-y-4">
          {registrationDetails}

          <p className="text-sm text-muted-foreground">
            An existing order was found. You can continue with this order.
          </p>

          <PaymentModeBranch
            orderResult={{
              order: {
                id: order.id,
                orderNumber: order.orderNumber,
                currency: order.currency,
              },
              manualPaymentInstructions,
            }}
            orderId={order.id}
            manualInstructionsText={manualPaymentInstructions}
          />

          <Link
            href={`/orders/${order.id}`}
            className="text-sm text-muted-foreground underline"
          >
            View order status
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {registrationDetails}

        <p className="rounded-lg border p-3 text-sm text-muted-foreground">
          An existing gateway order was found. Check its current status before
          attempting another payment.
        </p>

        <Link
          href={`/orders/${order.id}`}
          className="text-sm underline"
        >
          View order status
        </Link>
      </div>
    );
  }

  if (conflict) {
    return (
      <div className="space-y-4">
        {registrationDetails}

        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          An order conflict occurred. Check the existing order or retry the lookup.
        </p>

        <Button
          variant="outline"
          onClick={() => {
            setConflict(false);
            void existingOrderQuery.refetch();
          }}
        >
          Check existing order
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {registrationDetails}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        disabled={
          createOrder.isPending ||
          !registration ||
          existingOrderQuery.isPending ||
          existingOrderQuery.isError ||
          Boolean(existingOrderData)
        }
        onClick={handlePayNow}
      >
        {createOrder.isPending
          ? 'Starting checkout…'
          : 'Continue to payment'}
      </Button>
    </div>
  );
}
