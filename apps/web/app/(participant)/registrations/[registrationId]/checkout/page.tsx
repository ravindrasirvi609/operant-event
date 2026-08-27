'use client';

import { use } from 'react';
import { CheckoutFlow } from '@/components/registrations/checkout-flow';

export default function CheckoutPage({ params }: { params: Promise<{ registrationId: string }> }) {
  const { registrationId } = use(params);
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Checkout</h1>
      <CheckoutFlow registrationId={registrationId} />
    </div>
  );
}
