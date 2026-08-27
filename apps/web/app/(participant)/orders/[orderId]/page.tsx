'use client';

import { use } from 'react';
import { OrderStatusView } from '@/components/registrations/order-status-view';

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  return <OrderStatusView orderId={orderId} />;
}
