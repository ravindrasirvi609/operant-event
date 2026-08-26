'use client';

import { use } from 'react';
import { AbstractStatusBadge } from '@/components/abstracts/abstract-status-badge';
import { ForceSubmitButton } from '@/components/abstracts/force-submit-button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useOrganizerAbstract } from '@/hooks/use-organizer-abstracts';

export default function OrganizerAbstractDetailPage({
  params,
}: {
  params: Promise<{ conferenceId: string; abstractId: string }>;
}) {
  const { conferenceId, abstractId } = use(params);
  const abstractQuery = useOrganizerAbstract(conferenceId, abstractId);

  return (
    <AsyncBoundary
      query={abstractQuery}
      isEmpty={(abstract) => !abstract}
      empty={<p className="text-sm text-muted-foreground">Abstract not found.</p>}
    >
      {(abstract) => {
        const a = abstract!;
        return (
          <div className="max-w-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{a.title}</h2>
              <AbstractStatusBadge status={a.status} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Submission number</dt>
              <dd>{a.submissionNumber ?? '—'}</dd>
              <dt className="text-muted-foreground">Type</dt>
              <dd>{a.submissionType}</dd>
              <dt className="text-muted-foreground">Presentation preference</dt>
              <dd>{a.presentationPreference ?? '—'}</dd>
              <dt className="text-muted-foreground">Submitted at</dt>
              <dd>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : 'Not yet submitted'}</dd>
            </dl>
            {a.status === 'DRAFT' ? (
              <ForceSubmitButton conferenceId={conferenceId} abstractId={a.id} />
            ) : null}
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
