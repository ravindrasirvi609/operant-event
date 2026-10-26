
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentStatusBadge } from '@/components/sponsors/payment-status-badge';
import { AddStaffDialog } from '@/components/exhibitors/add-staff-dialog';
import { ExhibitorForm } from '@/components/exhibitors/exhibitor-form';
import { AsyncBoundary } from '@/components/query/async-boundary';
import {
  useExhibitors,
  useRemoveExhibitorStaff,
  useUpdateExhibitor,
} from '@/hooks/use-exhibitors';
import { PAYMENT_STATUSES, type SponsorPaymentStatus } from '@/lib/sponsors/types';
import type { Exhibitor } from '@/lib/exhibitors/types';

export function ExhibitorTable({ conferenceId }: { conferenceId: string }) {
  const exhibitorsQuery = useExhibitors(conferenceId);
  const updateExhibitor = useUpdateExhibitor(conferenceId);
  const removeStaff = useRemoveExhibitorStaff(conferenceId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingExhibitor, setEditingExhibitor] = useState<Exhibitor | undefined>();

  return (
    <div className="w-full min-w-0 space-y-5">
      {editingExhibitor && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <ExhibitorForm
            key={editingExhibitor.id}
            conferenceId={conferenceId}
            exhibitor={editingExhibitor}
            onCancel={() => setEditingExhibitor(undefined)}
            onSaved={() => setEditingExhibitor(undefined)}
          />
        </section>
      )}

      <AsyncBoundary
        query={exhibitorsQuery}
        empty={
          <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
            <h3 className="font-semibold">No exhibitors yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an exhibitor using the form below.
            </p>
          </div>
        }
      >
        {(exhibitors) => (
          <section className="w-full min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Exhibitor Directory
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage companies, booth assignments, payments and staff.
                </p>
              </div>

              <span className="rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
                {exhibitors.length}{' '}
                {exhibitors.length === 1 ? 'exhibitor' : 'exhibitors'}
              </span>
            </div>

            <div className="grid gap-4">
              {exhibitors.map((exhibitor) => {
                const expanded = expandedId === exhibitor.id;

                return (
                  <article
                    key={exhibitor.id}
                    className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
                  >
                    <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-base font-semibold">
                          {exhibitor.companyName}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                          {exhibitor.boothNumber ? (
                            <span className="rounded-md border bg-muted/30 px-2 py-1">
                              Booth {exhibitor.boothNumber}
                            </span>
                          ) : (
                            <span className="rounded-md border border-dashed px-2 py-1">
                              Booth not assigned
                            </span>
                          )}

                          {exhibitor.contactPerson && (
                            <span className="rounded-md border bg-muted/30 px-2 py-1">
                              Contact: {exhibitor.contactPerson}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            htmlFor={`payment-${exhibitor.id}`}
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Payment
                          </label>

                          <select
                            id={`payment-${exhibitor.id}`}
                            className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                            value={exhibitor.paymentStatus}
                            disabled={updateExhibitor.isPending}
                            onChange={(event) =>
                              updateExhibitor.mutate({
                                exhibitorId: exhibitor.id,
                                input: {
                                  paymentStatus: event.target.value as SponsorPaymentStatus,
                                },
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
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingExhibitor(exhibitor)}
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setExpandedId(expanded ? null : exhibitor.id)
                            }
                          >
                            {expanded
                              ? 'Hide staff'
                              : `Staff (${exhibitor.staff.length})`}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-5 space-y-3 border-t pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-semibold">Exhibitor staff</h4>
                          <AddStaffDialog
                            conferenceId={conferenceId}
                            exhibitorId={exhibitor.id}
                          />
                        </div>

                        {exhibitor.staff.length > 0 ? (
                          <ul className="divide-y rounded-lg border">
                            {exhibitor.staff.map((staff) => (
                              <li
                                key={staff.id}
                                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="break-words text-sm font-medium">
                                    {staff.name}
                                  </p>
                                  {staff.email && (
                                    <p className="break-all text-xs text-muted-foreground">
                                      {staff.email}
                                    </p>
                                  )}
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={removeStaff.isPending}
                                  className="w-fit text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => removeStaff.mutate(staff.id)}
                                >
                                  Remove staff
                                </Button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            No staff added yet.
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </AsyncBoundary>
    </div>
  );
}
