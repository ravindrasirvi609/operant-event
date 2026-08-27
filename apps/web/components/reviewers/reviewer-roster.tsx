'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { AddReviewerForm } from '@/components/reviewers/add-reviewer-form';
import { ReviewerProfileForm } from '@/components/reviewers/reviewer-profile-form';
import { useReviewers } from '@/hooks/use-reviewers';

/**
 * `GET reviewers` returns raw `Reviewer` rows with no joined `User`
 * name/email at all — there is no backend-provided way to show a human
 * name here. Each row is identified by its internal `userId`.
 */
export function ReviewerRoster({ organizationId }: { organizationId: string }) {
  const reviewersQuery = useReviewers(organizationId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="max-w-2xl space-y-6">
      <AsyncBoundary
        query={reviewersQuery}
        empty={<p className="text-sm text-muted-foreground">No reviewers added yet.</p>}
      >
        {(reviewers) => (
          <ul className="divide-y rounded-lg border">
            {reviewers.map((reviewer) => (
              <li key={reviewer.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">User {reviewer.userId}</p>
                    <p className="text-xs text-muted-foreground">
                      {reviewer.profile?.institution ?? 'No institution on file'}
                    </p>
                    {reviewer.profile?.expertise.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {reviewer.profile.expertise.map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{reviewer.status}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === reviewer.id ? null : reviewer.id)}
                    >
                      {expandedId === reviewer.id ? 'Close' : 'Edit profile'}
                    </Button>
                  </div>
                </div>
                {expandedId === reviewer.id ? (
                  <div className="mt-3 border-t pt-3">
                    <ReviewerProfileForm
                      organizationId={organizationId}
                      reviewerId={reviewer.id}
                      profile={reviewer.profile}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>

      <div className="space-y-3 border-t pt-4">
        <h2 className="text-sm font-semibold">Add a reviewer</h2>
        <AddReviewerForm organizationId={organizationId} />
      </div>
    </div>
  );
}
