'use client';

import Link from 'next/link';
import { use } from 'react';
import { Button } from '@/components/ui/button';
import { RegistrationStatusBadge } from '@/components/registrations/registration-status-badge';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useRegistration } from '@/hooks/use-registrations';

export default function RegistrationPage({ params }: { params: Promise<{ registrationId: string }> }) {
  const { registrationId } = use(params);
  const registrationQuery = useRegistration(registrationId);

  return (
    <AsyncBoundary query={registrationQuery}>
      {(registration) => (
        <div className="max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">{registration.registrationNumber}</h1>
            <RegistrationStatusBadge status={registration.status} />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Amount</dt>
            <dd>
              {registration.totalAmount} {registration.currency}
            </dd>
            <dt className="text-muted-foreground">Registered at</dt>
            <dd>{new Date(registration.registeredAt).toLocaleString()}</dd>
          </dl>
          {registration.status === 'PENDING' ? (
            <Button render={<Link href={`/registrations/${registration.id}/checkout`} />}>Pay now</Button>
          ) : null}
        </div>
      )}
    </AsyncBoundary>
  );
}
