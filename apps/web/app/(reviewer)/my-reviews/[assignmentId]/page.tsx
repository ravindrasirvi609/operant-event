'use client';

import { use, useState } from 'react';
import { ReviewerAssignmentCard } from '@/components/reviewers/reviewer-assignment-card';
import { ReviewScoreForm } from '@/components/reviewers/review-score-form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useDeclareConflict, useDeclineAssignment, useMyReviewAssignment, useSubmitReview } from '@/hooks/use-my-reviews';

const REVIEWABLE_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'OVERDUE']);
const DECIDABLE_STATUSES = new Set(['PENDING', 'IN_PROGRESS']);

export default function MyReviewAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const assignmentQuery = useMyReviewAssignment(assignmentId);
  const declineAssignment = useDeclineAssignment();
  const declareConflict = useDeclareConflict();
  const submitReview = useSubmitReview(assignmentId);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  return (
    <AsyncBoundary
      query={assignmentQuery}
      isEmpty={(assignment) => !assignment}
      empty={<p className="text-sm text-muted-foreground">Assignment not found.</p>}
    >
      {(assignment) => {
        const a = assignment!;
        const canReview = REVIEWABLE_STATUSES.has(a.status) && !a.review;
        const canDecide = DECIDABLE_STATUSES.has(a.status);

        return (
          <div className="max-w-2xl space-y-6">
            <ReviewerAssignmentCard assignment={a} />

            {canDecide ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDeclineOpen(true)}>
                  Decline
                </Button>
                <Button variant="outline" onClick={() => setConflictOpen(true)}>
                  Declare conflict of interest
                </Button>
              </div>
            ) : null}

            {canReview ? (
              <div className="space-y-3 border-t pt-6">
                <h2 className="text-sm font-semibold">Submit your review</h2>
                {submitError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {submitError}
                  </p>
                ) : null}
                <ReviewScoreForm
                  isSubmitting={submitReview.isPending}
                  onSubmit={async (values) => {
                    setSubmitError(null);
                    try {
                      await submitReview.mutateAsync(values);
                    } catch (error) {
                      setSubmitError(error instanceof Error ? error.message : 'Failed to submit review.');
                    }
                  }}
                />
              </div>
            ) : null}

            <ConfirmDialog
              open={declineOpen}
              onOpenChange={setDeclineOpen}
              title="Decline this assignment?"
              description="This is one-way from your side — only a chair can reassign it afterward."
              confirmLabel="Decline"
              isConfirming={declineAssignment.isPending}
              onConfirm={async () => {
                await declineAssignment.mutateAsync(assignmentId);
                setDeclineOpen(false);
              }}
            />
            <ConfirmDialog
              open={conflictOpen}
              onOpenChange={setConflictOpen}
              title="Declare a conflict of interest?"
              description="This is one-way from your side — only a chair can reassign it afterward."
              confirmLabel="Declare conflict"
              isConfirming={declareConflict.isPending}
              onConfirm={async () => {
                await declareConflict.mutateAsync(assignmentId);
                setConflictOpen(false);
              }}
            />
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
