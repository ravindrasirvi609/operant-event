'use client';

import { PendingPaymentsQueue } from '@/components/registrations/pending-payments-queue';

export default function PaymentsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payments</h2>
      <PendingPaymentsQueue />
    </div>
  );
}
