'use client';

import { use, useState } from 'react';
import { AbstractWizard } from '@/components/abstracts/abstract-wizard';
import { AbstractStatusBadge } from '@/components/abstracts/abstract-status-badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useMyAbstract, useWithdrawAbstract } from '@/hooks/use-abstracts';
import { EDITABLE_STATUSES, WITHDRAWABLE_STATUSES } from '@/lib/abstracts/types';

export default function MyAbstractDetailPage({ params }: { params: Promise<{ abstractId: string }> }) {
  const { abstractId } = use(params);
  const abstractQuery = useMyAbstract(abstractId);
  const withdrawAbstract = useWithdrawAbstract(abstractId);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <AsyncBoundary
      query={abstractQuery}
      isEmpty={(abstract) => !abstract}
      empty={<p className="text-sm text-muted-foreground">Abstract not found.</p>}
    >
      {(abstract) => {
        const a = abstract!;
        if (editing) {
          return (
            <AbstractWizard
              conferenceId={a.conferenceId}
              existingAbstractId={a.id}
              existingBasics={{
                title: a.title,
                submissionType: a.submissionType,
                trackId: a.trackId ?? undefined,
                presentationPreference: a.presentationPreference ?? undefined,
              }}
            />
          );
        }

        const canEdit = EDITABLE_STATUSES.includes(a.status);
        const canWithdraw = WITHDRAWABLE_STATUSES.includes(a.status);

        return (
          <div className="max-w-xl space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">{a.title}</h1>
              <AbstractStatusBadge status={a.status} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Submission number</dt>
              <dd>{a.submissionNumber ?? '—'}</dd>
              <dt className="text-muted-foreground">Type</dt>
              <dd>{a.submissionType}</dd>
              <dt className="text-muted-foreground">Submitted at</dt>
              <dd>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : 'Not yet submitted'}</dd>
            </dl>
            <div className="flex gap-2">
              {canEdit ? (
                <Button onClick={() => setEditing(true)}>
                  {a.status === 'REVISION_REQUIRED' ? 'Revise & resubmit' : 'Continue editing'}
                </Button>
              ) : null}
              {canWithdraw ? (
                <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
                  Withdraw
                </Button>
              ) : null}
            </div>
            <ConfirmDialog
              open={withdrawOpen}
              onOpenChange={setWithdrawOpen}
              title="Withdraw this abstract?"
              description="Withdrawing may not be reversible — there is no 'un-withdraw' action available."
              confirmLabel="Withdraw"
              isConfirming={withdrawAbstract.isPending}
              onConfirm={() => withdrawAbstract.mutate()}
            />
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
