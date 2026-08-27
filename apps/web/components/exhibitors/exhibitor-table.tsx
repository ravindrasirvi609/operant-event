'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentStatusBadge } from '@/components/sponsors/payment-status-badge';
import { AddStaffDialog } from '@/components/exhibitors/add-staff-dialog';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useExhibitors, useRemoveExhibitorStaff, useUpdateExhibitor } from '@/hooks/use-exhibitors';
import { PAYMENT_STATUSES, type SponsorPaymentStatus } from '@/lib/sponsors/types';

export function ExhibitorTable({ conferenceId }: { conferenceId: string }) {
  const exhibitorsQuery = useExhibitors(conferenceId);
  const updateExhibitor = useUpdateExhibitor(conferenceId);
  const removeStaff = useRemoveExhibitorStaff(conferenceId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <AsyncBoundary query={exhibitorsQuery} empty={<p className="text-sm text-muted-foreground">No exhibitors yet.</p>}>
      {(exhibitors) => (
        <ul className="space-y-3">
          {exhibitors.map((exhibitor) => {
            const expanded = expandedId === exhibitor.id;
            return (
              <li key={exhibitor.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{exhibitor.companyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[exhibitor.boothNumber && `Booth ${exhibitor.boothNumber}`, exhibitor.contactPerson]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={exhibitor.paymentStatus}
                      onChange={(event) =>
                        updateExhibitor.mutate({
                          exhibitorId: exhibitor.id,
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
                    <PaymentStatusBadge status={exhibitor.paymentStatus} />
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(expanded ? null : exhibitor.id)}>
                      {expanded ? 'Hide staff' : `Staff (${exhibitor.staff.length})`}
                    </Button>
                  </div>
                </div>
                {expanded ? (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <ul className="space-y-1 text-sm">
                      {exhibitor.staff.map((staff) => (
                        <li key={staff.id} className="flex items-center justify-between">
                          <span>
                            {staff.name}
                            {staff.email ? ` (${staff.email})` : ''}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => removeStaff.mutate(staff.id)}>
                            Remove
                          </Button>
                        </li>
                      ))}
                      {exhibitor.staff.length === 0 ? (
                        <li className="text-muted-foreground">No staff added yet.</li>
                      ) : null}
                    </ul>
                    <AddStaffDialog conferenceId={conferenceId} exhibitorId={exhibitor.id} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AsyncBoundary>
  );
}
