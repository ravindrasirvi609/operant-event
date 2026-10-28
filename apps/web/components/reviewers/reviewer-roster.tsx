'use client';

import { useState } from 'react';
import {
  Mail,
  Building2,
  BriefcaseBusiness,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { AddReviewerForm } from '@/components/reviewers/add-reviewer-form';
import { ReviewerProfileForm } from '@/components/reviewers/reviewer-profile-form';
import { useReviewers } from '@/hooks/use-reviewers';

export function ReviewerRoster({
  organizationId,
}: {
  organizationId: string;
  conferenceId: string;
}) {
  const reviewersQuery = useReviewers(organizationId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="w-full max-w-5xl space-y-8">
      {/* Reviewer Pool */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Reviewer Pool
          </h2>

          <p className="text-sm text-muted-foreground">
            Manage reviewers who can be assigned to evaluate conference
            abstracts.
          </p>
        </div>

        <AsyncBoundary
          query={reviewersQuery}
          empty={
            <div className="rounded-xl border border-dashed p-8 text-center">
              <UserRound className="mx-auto mb-3 size-8 text-muted-foreground" />

              <p className="text-sm font-medium">
                No reviewers added yet
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Add a reviewer below to start assigning abstracts.
              </p>
            </div>
          }
        >
          {(reviewers) => (
            <div className="space-y-3">
              {reviewers.map((reviewer) => {
                const fullName = [
                  reviewer.user?.firstName,
                  reviewer.user?.lastName,
                ]
                  .filter(Boolean)
                  .join(' ')
                  .trim();

                const displayName =
                  fullName || reviewer.user?.email || 'Reviewer';

                return (
                  <div
                    key={reviewer.id}
                    className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        {/* Reviewer information */}
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                              <UserRound className="size-5 text-muted-foreground" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold">
                                  {displayName}
                                </h3>

                                <Badge variant="outline">
                                  {reviewer.status}
                                </Badge>
                              </div>

                              {reviewer.user?.email ? (
                                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Mail className="size-3.5 shrink-0" />
                                  <span className="truncate">
                                    {reviewer.user.email}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="ml-13 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                            {reviewer.profile?.institution ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Building2 className="size-3.5" />
                                {reviewer.profile.institution}
                              </span>
                            ) : null}

                            {reviewer.profile?.designation ? (
                              <span className="inline-flex items-center gap-1.5">
                                <BriefcaseBusiness className="size-3.5" />
                                {reviewer.profile.designation}
                              </span>
                            ) : null}
                          </div>

                          {reviewer.profile?.expertise.length ? (
                            <div className="ml-13 flex flex-wrap gap-1.5">
                              {reviewer.profile.expertise.map((item) => (
                                <Badge
                                  key={item}
                                  variant="secondary"
                                >
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant={
                              expandedId === reviewer.id
                                ? 'outline'
                                : 'ghost'
                            }
                            size="sm"
                            onClick={() =>
                              setExpandedId(
                                expandedId === reviewer.id
                                  ? null
                                  : reviewer.id,
                              )
                            }
                          >
                            {expandedId === reviewer.id
                              ? 'Close'
                              : 'Edit profile'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Profile editor */}
                    {expandedId === reviewer.id ? (
                      <div className="border-t bg-muted/20 p-5">
                        <ReviewerProfileForm
                          organizationId={organizationId}
                          reviewerId={reviewer.id}
                          profile={reviewer.profile}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </AsyncBoundary>
      </section>

      {/* Add Reviewer */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold">
            Add a reviewer
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Add an existing user to this organization&apos;s reviewer pool
            using their account email.
          </p>
        </div>

        <AddReviewerForm organizationId={organizationId} />
      </section>
    </div>
  );
}