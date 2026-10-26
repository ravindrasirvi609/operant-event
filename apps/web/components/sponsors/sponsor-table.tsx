
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaymentStatusBadge } from '@/components/sponsors/payment-status-badge';
import { SponsorTierBadge } from '@/components/sponsors/sponsor-tier-badge';
import { SponsorForm } from '@/components/sponsors/sponsor-form';
import { AsyncBoundary } from '@/components/query/async-boundary';
import {
  useDeleteSponsor,
  useSponsors,
  useUpdateSponsor,
} from '@/hooks/use-sponsors';
import {
  PAYMENT_STATUSES,
  type SponsorPaymentStatus,
  type Sponsor,
} from '@/lib/sponsors/types';

function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  if (!sponsor.logoFileId) {
    return (
      <div className="flex h-14 w-16 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
        No logo
      </div>
    );
  }

  return (
    <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-lg border bg-white p-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/proxy/files/${encodeURIComponent(sponsor.logoFileId)}/preview`}
        alt={`${sponsor.name} logo`}
        className="h-full w-full object-contain"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}

function SponsorContact({ sponsor }: { sponsor: Sponsor }) {
  if (!sponsor.contactName && !sponsor.contactEmail) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="min-w-0 space-y-1">
      {sponsor.contactName && (
        <p className="break-words font-medium text-foreground">
          {sponsor.contactName}
        </p>
      )}
      {sponsor.contactEmail && (
        <a
          href={`mailto:${sponsor.contactEmail}`}
          title={sponsor.contactEmail}
          className="block break-all text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {sponsor.contactEmail}
        </a>
      )}
    </div>
  );
}

function SponsorWebsite({ website }: { website: string | null }) {
  if (!website) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <a
      href={website}
      target="_blank"
      rel="noopener noreferrer"
      title={website}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      Visit site ↗
    </a>
  );
}

export function SponsorTable({ conferenceId }: { conferenceId: string }) {
  const sponsorsQuery = useSponsors(conferenceId);
  const updateSponsor = useUpdateSponsor(conferenceId);
  const deleteSponsor = useDeleteSponsor(conferenceId);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | undefined>();

  return (
    <div className="w-full min-w-0 space-y-5">
      {editingSponsor && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <SponsorForm
            key={editingSponsor.id}
            conferenceId={conferenceId}
            sponsor={editingSponsor}
            onCancel={() => setEditingSponsor(undefined)}
            onSaved={() => setEditingSponsor(undefined)}
          />
        </section>
      )}

      <AsyncBoundary
        query={sponsorsQuery}
        empty={
          <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
            <h3 className="font-semibold text-foreground">No sponsors yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first sponsor using the form below.
            </p>
          </div>
        }
      >
        {(sponsors) => (
          <section className="w-full min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Sponsors
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage sponsor details, logos and payment status.
                </p>
              </div>

              <span className="rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
                {sponsors.length}{' '}
                {sponsors.length === 1 ? 'sponsor' : 'sponsors'}
              </span>
            </div>

            {/* Mobile layout */}
            <div className="grid min-w-0 gap-3 md:hidden">
              {sponsors.map((sponsor) => (
                <article
                  key={sponsor.id}
                  className="min-w-0 space-y-4 rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <SponsorLogo sponsor={sponsor} />
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="break-words font-semibold leading-5">
                        {sponsor.name}
                      </h3>
                      <SponsorTierBadge tier={sponsor.tier} />
                    </div>
                  </div>

                  <div className="grid gap-1.5 border-t pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Contact
                    </p>
                    <SponsorContact sponsor={sponsor} />
                  </div>

                  <div className="grid gap-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Website
                    </p>
                    <SponsorWebsite website={sponsor.website} />
                  </div>

                  {sponsor.notes && (
                    <div className="grid gap-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Internal notes
                      </p>
                      <p className="break-words whitespace-pre-wrap text-sm leading-5 text-muted-foreground">
                        {sponsor.notes}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-2 border-t pt-3">
                    <label
                      htmlFor={`payment-mobile-${sponsor.id}`}
                      className="text-sm font-medium"
                    >
                      Payment status
                    </label>
                    <select
                      id={`payment-mobile-${sponsor.id}`}
                      aria-label={`Payment status for ${sponsor.name}`}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      value={sponsor.paymentStatus}
                      disabled={updateSponsor.isPending}
                      onChange={(event) =>
                        updateSponsor.mutate({
                          sponsorId: sponsor.id,
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
                    <PaymentStatusBadge status={sponsor.paymentStatus} />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSponsor(sponsor)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeletingId(sponsor.id)}
                    >
                      Remove sponsor
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden w-full min-w-0 rounded-2xl border bg-card shadow-sm md:block">
              <table className="w-full table-fixed text-left text-xs xl:text-sm">
                <colgroup>
                  <col className="w-[8%]" />
                  <col className="w-[14%]" />
                  <col className="w-[8%]" />
                  <col className="w-[17%]" />
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                  <col className="w-[15%]" />
                  <col className="w-[14%]" />
                </colgroup>

                <thead className="bg-muted/40">
                  <tr className="border-b text-[10px] font-semibold uppercase tracking-wide text-muted-foreground xl:text-xs">
                    <th scope="col" className="px-2 py-3 xl:px-3">Logo</th>
                    <th scope="col" className="px-2 py-3 xl:px-3">Sponsor</th>
                    <th scope="col" className="px-2 py-3 xl:px-3">Tier</th>
                    <th scope="col" className="px-2 py-3 xl:px-3">Contact</th>
                    <th scope="col" className="px-2 py-3 xl:px-3">Website</th>
                    <th scope="col" className="px-2 py-3 xl:px-3">Notes</th>
                    <th scope="col" className="px-2 py-3 xl:px-3">Payment</th>
                    <th scope="col" className="px-2 py-3 xl:px-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {sponsors.map((sponsor) => (
                    <tr
                      key={sponsor.id}
                      className="align-top transition-colors hover:bg-muted/20"
                    >
                      <td className="px-2 py-3 xl:px-3">
                        <SponsorLogo sponsor={sponsor} />
                      </td>

                      <td className="px-2 py-3 xl:px-3">
                        <p className="break-words font-semibold leading-5">
                          {sponsor.name}
                        </p>
                      </td>

                      <td className="px-2 py-3 xl:px-3">
                        <SponsorTierBadge tier={sponsor.tier} />
                      </td>

                      <td className="px-2 py-3 xl:px-3">
                        <SponsorContact sponsor={sponsor} />
                      </td>

                      <td className="px-2 py-3 xl:px-3">
                        <SponsorWebsite website={sponsor.website} />
                      </td>

                      <td className="px-2 py-3 xl:px-3">
                        <p
                          title={sponsor.notes || undefined}
                          className="break-words whitespace-pre-wrap leading-5 text-muted-foreground"
                        >
                          {sponsor.notes || '—'}
                        </p>
                      </td>

                      <td className="px-2 py-3 xl:px-3">
                        <div className="space-y-2">
                          <select
                            aria-label={`Payment status for ${sponsor.name}`}
                            className="h-9 w-full min-w-0 rounded-lg border border-input bg-background px-1 text-xs xl:px-2 xl:text-sm"
                            value={sponsor.paymentStatus}
                            disabled={updateSponsor.isPending}
                            onChange={(event) =>
                              updateSponsor.mutate({
                                sponsorId: sponsor.id,
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
                          <PaymentStatusBadge status={sponsor.paymentStatus} />
                        </div>
                      </td>

                      <td className="px-2 py-3 xl:px-3">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => setEditingSponsor(sponsor)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeletingId(sponsor.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </AsyncBoundary>

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

            if (editingSponsor?.id === deletingId) {
              setEditingSponsor(undefined);
            }
          }
        }}
      />
    </div>
  );
}
