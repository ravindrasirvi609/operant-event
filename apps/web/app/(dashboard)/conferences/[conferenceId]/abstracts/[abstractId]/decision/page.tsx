'use client';

import { use } from 'react';
import { AbstractStatusBadge } from '@/components/abstracts/abstract-status-badge';
import { DecisionForm } from '@/components/reviewers/decision-form';
import { RequestRevisionForm } from '@/components/reviewers/request-revision-form';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useOrganizerAbstract } from '@/hooks/use-organizer-abstracts';

export default function AbstractDecisionPage({
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
          <div className="max-w-md space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">{a.title}</h1>
              <AbstractStatusBadge status={a.status} />
            </div>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Record final decision</h2>
              <DecisionForm abstractId={abstractId} />
            </section>

            <section className="space-y-3 border-t pt-6">
              <h2 className="text-sm font-semibold">Request a revision instead</h2>
              <RequestRevisionForm abstractId={abstractId} />
            </section>
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
