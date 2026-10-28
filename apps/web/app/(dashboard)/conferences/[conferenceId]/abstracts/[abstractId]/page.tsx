'use client';

import Link from 'next/link';
import { use } from 'react';

import { AbstractStatusBadge } from '@/components/abstracts/abstract-status-badge';
import { ForceSubmitButton } from '@/components/abstracts/force-submit-button';
import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';

import { useOrganizerAbstract } from '@/hooks/use-organizer-abstracts';
import { useAbstractReviews } from '@/hooks/use-review-assignments';

export default function OrganizerAbstractDetailPage({
  params,
}: {
  params: Promise<{ conferenceId: string; abstractId: string }>;
}) {
  const { conferenceId, abstractId } = use(params);

  const abstractQuery = useOrganizerAbstract(
    conferenceId,
    abstractId,
  );

  const reviewsQuery = useAbstractReviews(
    conferenceId,
    abstractId,
  );

  return (
    <AsyncBoundary
      query={abstractQuery}
      isEmpty={(abstract) => !abstract}
      empty={
        <p className="text-sm text-muted-foreground">
          Abstract not found.
        </p>
      }
    >
      {(abstract) => {
        const a = abstract!;

        return (
          <div className="max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight">
                  {a.title}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Abstract submission details and reviewer feedback
                </p>
              </div>

              <div className="shrink-0">
                <AbstractStatusBadge status={a.status} />
              </div>
            </div>

            {/* Submission Details */}
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold">
                  Submission Details
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Basic information about this abstract submission.
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">
                    Submission number
                  </dt>

                  <dd className="mt-1 font-medium">
                    {a.submissionNumber ?? '—'}
                  </dd>
                </div>

                <div>
                  <dt className="text-muted-foreground">
                    Status
                  </dt>

                  <dd className="mt-1 font-medium">
                    {a.status}
                  </dd>
                </div>

                <div>
                  <dt className="text-muted-foreground">
                    Submission type
                  </dt>

                  <dd className="mt-1 font-medium">
                    {a.submissionType}
                  </dd>
                </div>

                <div>
                  <dt className="text-muted-foreground">
                    Presentation preference
                  </dt>

                  <dd className="mt-1 font-medium">
                    {a.presentationPreference ?? '—'}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">
                    Submitted at
                  </dt>

                  <dd className="mt-1 font-medium">
                    {a.submittedAt
                      ? new Date(
                          a.submittedAt,
                        ).toLocaleString()
                      : 'Not yet submitted'}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Reviews */}
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">
                      Reviews
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Reviewer scores, recommendations, and feedback.
                    </p>
                  </div>

                  {reviewsQuery.data &&
                    reviewsQuery.data.length > 0 && (
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                        {reviewsQuery.data.length}{' '}
                        {reviewsQuery.data.length === 1
                          ? 'Review'
                          : 'Reviews'}
                      </span>
                    )}
                </div>
              </div>

              {reviewsQuery.isPending ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Loading reviews...
                  </p>
                </div>
              ) : reviewsQuery.isError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
                  <p className="text-sm font-medium text-destructive">
                    Unable to load reviewer feedback.
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Please refresh the page and try again.
                  </p>
                </div>
              ) : !reviewsQuery.data ||
                reviewsQuery.data.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm font-medium">
                    No reviews yet
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Reviewer feedback will appear here once a review
                    is submitted.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {reviewsQuery.data.map((assignment) => {
                    const reviewer = assignment.reviewer;
                    const review = assignment.review;

                    const fullName = [
                      reviewer?.user?.firstName,
                      reviewer?.user?.lastName,
                    ]
                      .filter(Boolean)
                      .join(' ')
                      .trim();

                    const reviewerName =
                      fullName ||
                      reviewer?.user?.email ||
                      'Reviewer';

                    return (
                      <article
                        key={assignment.id}
                        className="overflow-hidden rounded-xl border"
                      >
                        {/* Reviewer Header */}
                        <div className="flex flex-col gap-3 border-b bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h4 className="font-semibold">
                              {reviewerName}
                            </h4>

                            {reviewer?.user?.email && (
                              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                {reviewer.user.email}
                              </p>
                            )}
                          </div>

                          <span className="w-fit rounded-full border bg-background px-3 py-1 text-xs font-medium">
                            {assignment.status}
                          </span>
                        </div>

                        {/* No submitted review */}
                        {!review ? (
                          <div className="p-5">
                            <p className="text-sm text-muted-foreground">
                              This reviewer has been assigned, but the
                              review has not been submitted yet.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-5 p-5">
                            {/* Scores */}
                            <div>
                              <h5 className="mb-3 text-sm font-semibold">
                                Scores
                              </h5>

                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {review.overallScore != null && (
                                  <ScoreCard
                                    label="Overall"
                                    score={review.overallScore}
                                  />
                                )}

                                {review.originalityScore != null && (
                                  <ScoreCard
                                    label="Originality"
                                    score={review.originalityScore}
                                  />
                                )}

                                {review.methodologyScore != null && (
                                  <ScoreCard
                                    label="Methodology"
                                    score={review.methodologyScore}
                                  />
                                )}

                                {review.significanceScore != null && (
                                  <ScoreCard
                                    label="Significance"
                                    score={review.significanceScore}
                                  />
                                )}

                                {review.presentationScore != null && (
                                  <ScoreCard
                                    label="Presentation"
                                    score={review.presentationScore}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Recommendation */}
                            {review.recommendation && (
                              <div>
                                <h5 className="mb-2 text-sm font-semibold">
                                  Recommendation
                                </h5>

                                <span className="inline-flex rounded-full border bg-muted/40 px-3 py-1.5 text-sm font-medium">
                                  {formatRecommendation(
                                    review.recommendation,
                                  )}
                                </span>
                              </div>
                            )}

                            {/* Comments to Author */}
                            {review.commentsToAuthor && (
                              <div>
                                <h5 className="mb-2 text-sm font-semibold">
                                  Comments to Author
                                </h5>

                                <div className="rounded-lg border bg-muted/20 p-4">
                                  <p className="whitespace-pre-wrap text-sm leading-6">
                                    {review.commentsToAuthor}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Private Comments */}
                            {review.privateComments && (
                              <div>
                                <h5 className="mb-2 text-sm font-semibold">
                                  Private Comments
                                </h5>

                                <div className="rounded-lg border bg-muted/20 p-4">
                                  <p className="whitespace-pre-wrap text-sm leading-6">
                                    {review.privateComments}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Submitted At */}
                            {review.submittedAt && (
                              <p className="border-t pt-4 text-xs text-muted-foreground">
                                Review submitted{' '}
                                {new Date(
                                  review.submittedAt,
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {a.status === 'DRAFT' ? (
                <ForceSubmitButton
                  conferenceId={conferenceId}
                  abstractId={a.id}
                />
              ) : null}

              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={`/conferences/${conferenceId}/abstracts/${a.id}/decision`}
                  />
                }
              >
                Record decision
              </Button>
            </div>
          </div>
        );
      }}
    </AsyncBoundary>
  );
}

function ScoreCard({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {score}
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          / 5
        </span>
      </p>
    </div>
  );
}

function formatRecommendation(
  recommendation: string,
) {
  return recommendation
    .toLowerCase()
    .split('_')
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(' ');
}