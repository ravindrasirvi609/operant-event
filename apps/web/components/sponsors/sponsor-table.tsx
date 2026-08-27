'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaymentStatusBadge } from '@/components/sponsors/payment-status-badge';
import { SponsorTierBadge } from '@/components/sponsors/sponsor-tier-badge';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useDeleteSponsor, useSponsors, useUpdateSponsor } from '@/hooks/use-sponsors';
import { PAYMENT_STATUSES, type SponsorPaymentStatus } from '@/lib/sponsors/types';

export function SponsorTable({ conferenceId }: { conferenceId: string }) {
  const sponsorsQuery = useSponsors(conferenceId);
  const updateSponsor = useUpdateSponsor(conferenceId);
  const deleteSponsor = useDeleteSponsor(conferenceId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <AsyncBoundary query={sponsorsQuery} empty={<p className="text-sm text-muted-foreground">No sponsors yet.</p>}>
      {(sponsors) => (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1">Name</th>
                <th className="py-1">Tier</th>
                <th className="py-1">Contact</th>
                <th className="py-1">Payment</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((sponsor) => (
                <tr key={sponsor.id} className="border-t">
                  <td className="py-2">{sponsor.name}</td>
                  <td className="py-2">
                    <SponsorTierBadge tier={sponsor.tier} />
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {sponsor.contactName ?? sponsor.contactEmail ?? '—'}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <select
                        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                        value={sponsor.paymentStatus}
                        onChange={(event) =>
                          updateSponsor.mutate({
                            sponsorId: sponsor.id,
                            input: { paymentStatus: event.target.value as SponsorPaymentStatus },
                          })
                        }
                      >
                        {PAYMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <PaymentStatusBadge status={sponsor.paymentStatus} />
                    </div>
                  </td>
                  <td className="py-2">
                    <Button variant="ghost" size="sm" onClick={() => setDeletingId(sponsor.id)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ConfirmDialog
            open={deletingId !== null}
            onOpenChange={(open) => !open && setDeletingId(null)}
            title="Remove this sponsor?"
            confirmLabel="Remove"
            isConfirming={deleteSponsor.isPending}
            onConfirm={async () => {
              if (deletingId) {
                await deleteSponsor.mutateAsync(deletingId);
                setDeletingId(null);
              }
            }}
          />
        </>
      )}
    </AsyncBoundary>
  );
}
