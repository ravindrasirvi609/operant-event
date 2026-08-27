'use client';

import Link from 'next/link';
import { ReviewerAssignmentCard } from '@/components/reviewers/reviewer-assignment-card';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useMyReviewAssignments } from '@/hooks/use-my-reviews';

export default function MyReviewsPage() {
  const assignmentsQuery = useMyReviewAssignments();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">My reviews</h1>
      <AsyncBoundary
        query={assignmentsQuery}
        empty={<p className="text-sm text-muted-foreground">No review assignments yet.</p>}
      >
        {(assignments) => (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <Link key={assignment.id} href={`/my-reviews/${assignment.id}`} className="block">
                <ReviewerAssignmentCard assignment={assignment} />
              </Link>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
