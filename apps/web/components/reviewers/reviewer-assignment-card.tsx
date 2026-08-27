import { Badge } from '@/components/ui/badge';
import type { ReviewAssignmentProjection } from '@/lib/reviewers/types';

/**
 * `assignment.abstract.submittedBy` is genuinely ABSENT from the API
 * response in SINGLE_BLIND/DOUBLE_BLIND mode (not present-but-hidden) —
 * this renders nothing (no DOM node at all) rather than a placeholder
 * like "Author: —", which would still leak "there is exactly one
 * author" structurally. Only OPEN review mode ever includes the key.
 */
export function ReviewerAssignmentCard({ assignment }: { assignment: ReviewAssignmentProjection }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{assignment.abstract.title}</h3>
        <Badge variant={assignment.status === 'OVERDUE' ? 'destructive' : 'outline'}>{assignment.status}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
        <dt>Submission type</dt>
        <dd>{assignment.abstract.submissionType}</dd>
        <dt>Abstract status</dt>
        <dd>{assignment.abstract.status}</dd>
        <dt>Due date</dt>
        <dd>{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}</dd>
        {'submittedBy' in assignment.abstract ? (
          <>
            <dt>Author</dt>
            <dd data-testid="assignment-author">{assignment.abstract.submittedBy}</dd>
          </>
        ) : null}
      </dl>
      {assignment.review ? (
        <div className="rounded-md bg-muted/50 p-2 text-xs">
          <span className="font-medium">Your submitted recommendation: </span>
          {assignment.review.recommendation}
        </div>
      ) : null}
    </div>
  );
}
