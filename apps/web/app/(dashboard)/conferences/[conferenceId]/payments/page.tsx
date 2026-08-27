'use client';

import { use } from 'react';
import { PendingPaymentsQueue } from '@/components/registrations/pending-payments-queue';

export default function PaymentsPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payments</h2>
      <PendingPaymentsQueue conferenceId={conferenceId} />
    </div>
  );
}
