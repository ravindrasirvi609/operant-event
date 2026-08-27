'use client';

import { useRef } from 'react';
import { OrderStatusBadge } from '@/components/registrations/order-status-badge';
import { InvoiceView } from '@/components/registrations/invoice-view';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useOrder } from '@/hooks/use-orders';
import { useInvoice } from '@/hooks/use-invoices';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

/** Polls `GET orders/:orderId` directly — gateway confirmation is webhook-driven and can lag the checkout redirect by a few seconds. */
export function OrderStatusView({ orderId }: { orderId: string }) {
  const pollCount = useRef(0);
  const orderQuery = useOrder(orderId, {
    refetchInterval: (query) => {
      if (query.state.data?.status !== 'PENDING' || pollCount.current >= MAX_POLLS) {
        return false;
      }
      pollCount.current += 1;
      return POLL_INTERVAL_MS;
    },
  });
  const invoiceQuery = useInvoice(orderId);

  return (
    <AsyncBoundary query={orderQuery}>
      {(order) => (
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Order {order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          {order.status === 'PENDING' ? (
            <p className="text-sm text-muted-foreground">Confirming payment…</p>
          ) : null}
          <p className="text-sm">
            Total: {order.total} {order.currency}
          </p>
          <AsyncBoundary query={invoiceQuery}>{(invoice) => <InvoiceView invoice={invoice ?? null} />}</AsyncBoundary>
        </div>
      )}
    </AsyncBoundary>
  );
}
