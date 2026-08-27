'use client';

import { Suspense, use } from 'react';
import { OrderStatusView } from '@/components/registrations/order-status-view';

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <OrderStatusView orderId={orderId} />
    </Suspense>
  );
}
