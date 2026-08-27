'use client';

import { useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { RegistrationStatusBadge } from '@/components/registrations/registration-status-badge';
import { InvoiceView } from '@/components/registrations/invoice-view';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useRegistration } from '@/hooks/use-registrations';
import { useInvoice } from '@/hooks/use-invoices';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

/**
 * There is no `GET orders/:orderId` endpoint, so order status itself
 * can't be polled directly — this polls the **registration** instead
 * (`GET registrations/:id`, `JwtAuthGuard` only), which the backend
 * flips to `CONFIRMED` in the same transaction that marks the order
 * `PAID` (`confirmOrderPaid`). `registrationId` travels in the URL
 * query string specifically so this page's polling survives a hard
 * refresh even when the sessionStorage order cache doesn't.
 */
export function OrderStatusView({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get('registrationId');
  const invoiceQuery = useInvoice(orderId);

  if (!registrationId) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
        This page needs a registration ID to check payment status (there is no way to look one up from just an
        order ID) — reach it via the checkout flow&apos;s &quot;View order status&quot; link instead of navigating
        here directly.
      </p>
    );
  }

  return (
    <PollingRegistrationStatus registrationId={registrationId} orderId={orderId} invoiceQuery={invoiceQuery} />
  );
}

function PollingRegistrationStatus({
  registrationId,
  orderId,
  invoiceQuery,
}: {
  registrationId: string;
  orderId: string;
  invoiceQuery: ReturnType<typeof useInvoice>;
}) {
  const pollCount = useRef(0);
  const registrationQuery = useRegistration(registrationId, {
    refetchInterval: (query) => {
      if (query.state.data?.status !== 'PENDING' || pollCount.current >= MAX_POLLS) {
        return false;
      }
      pollCount.current += 1;
      return POLL_INTERVAL_MS;
    },
  });

  return (
    <AsyncBoundary query={registrationQuery}>
      {(registration) => (
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Order</h1>
            <RegistrationStatusBadge status={registration.status} />
          </div>
          {registration.status === 'PENDING' ? (
            <p className="text-sm text-muted-foreground">Confirming payment…</p>
          ) : null}
          <AsyncBoundary query={invoiceQuery}>{(invoice) => <InvoiceView invoice={invoice ?? null} />}</AsyncBoundary>
          <p className="text-xs text-muted-foreground">Order {orderId}</p>
        </div>
      )}
    </AsyncBoundary>
  );
}
