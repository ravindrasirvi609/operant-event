'use client';

import Link from 'next/link';
import { use } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { Button } from '@/components/ui/button';
import { RegistrationStatusBadge } from '@/components/registrations/registration-status-badge';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useRegistration } from '@/hooks/use-registrations';

export default function RegistrationPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = use(params);
  const registrationQuery = useRegistration(registrationId);

  return (
    <AsyncBoundary query={registrationQuery}>
      {(registration) => (
        <div className="max-w-lg space-y-6">
          {/* Back to registration */}
          
          <div>
            <Button
              nativeButton={false}
              variant="ghost"
              render={
                <Link
                  href={`/conferences/${registration.conferenceId}/register`}
                />
              }
            >
              <span aria-hidden="true" className="mr-2">
                ←
              </span>
              Back to registration
            </Button>
          </div>
            

          {/* Registration number and status */}
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">
              {registration.registrationNumber}
            </h1>

            <RegistrationStatusBadge status={registration.status} />
          </div>

          {/* Registration details */}
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Amount</dt>
            <dd>
              {registration.totalAmount} {registration.currency}
            </dd>

            <dt className="text-muted-foreground">Registered at</dt>
            <dd>
              {new Date(registration.registeredAt).toLocaleString()}
            </dd>
          </dl>

          {/* Pay now button for pending registrations */}
          {registration.status === 'PENDING' ? (
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/registrations/${registration.id}/checkout`}
                />
              }
            >
              Pay now
            </Button>
          ) : null}

          {/* Confirmed registration and QR code */}
          {registration.status === 'CONFIRMED' && registration.qrCode ? (
            <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
              <h2 className="text-lg font-semibold">
                Registration Confirmed
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Show this QR code at the check-in desk.
              </p>

              <div className="mx-auto mt-5 flex w-fit rounded-xl border bg-white p-4">
                <QRCodeSVG
                  value={registration.qrCode}
                  size={220}
                  level="M"
                  includeMargin
                />
              </div>

              <div className="mt-4">
                <p className="text-xs text-muted-foreground">
                  Registration Number
                </p>

                <p className="font-semibold">
                  {registration.registrationNumber}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AsyncBoundary>
  );
}