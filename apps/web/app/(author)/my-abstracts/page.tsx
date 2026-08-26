'use client';

import Link from 'next/link';
import { AbstractStatusBadge } from '@/components/abstracts/abstract-status-badge';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useMyAbstracts } from '@/hooks/use-abstracts';

export default function MyAbstractsPage() {
  const abstractsQuery = useMyAbstracts();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">My abstracts</h1>
      <AsyncBoundary
        query={abstractsQuery}
        empty={<p className="text-sm text-muted-foreground">You haven&apos;t submitted anything yet.</p>}
      >
        {(abstracts) => (
          <ul className="divide-y rounded-lg border">
            {abstracts.map((abstract) => (
              <li key={abstract.id}>
                <Link
                  href={`/my-abstracts/${abstract.id}`}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{abstract.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {abstract.submissionNumber ?? 'No submission number yet'} · {abstract.submissionType}
                    </p>
                  </div>
                  <AbstractStatusBadge status={abstract.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}
