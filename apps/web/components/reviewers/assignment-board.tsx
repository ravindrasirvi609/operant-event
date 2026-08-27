'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ReviewDashboardCounts } from '@/components/reviewers/review-dashboard-counts';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useOrganizerAbstracts } from '@/hooks/use-organizer-abstracts';
import { useAssignReview, useReviewDashboard } from '@/hooks/use-review-assignments';
import { useReviewers } from '@/hooks/use-reviewers';

const assignSchema = z.object({
  abstractId: z.string().min(1, 'Select an abstract.'),
  reviewerId: z.string().min(1, 'Select a reviewer.'),
  dueDate: z.string().optional(),
});

type AssignValues = z.infer<typeof assignSchema>;

/**
 * There is no endpoint to preview a conflict-of-interest check before
 * assigning — `ConflictOfInterestService.check()` only ever runs inside
 * the real assign call, which throws a 409 with the exact reason(s) on a
 * real conflict. That 409 message is shown as-is below; there is no
 * earlier warning to surface.
 */
export function AssignmentBoard({ organizationId, conferenceId }: { organizationId: string; conferenceId: string }) {
  const dashboardQuery = useReviewDashboard(conferenceId);
  const abstractsQuery = useOrganizerAbstracts(conferenceId);
  const reviewersQuery = useReviewers(organizationId);
  const assignReview = useAssignReview(conferenceId);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigned, setAssigned] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignValues>({ resolver: zodResolver(assignSchema) });

  async function onSubmit(values: AssignValues) {
    setAssignError(null);
    setAssigned(false);
    try {
      await assignReview.mutateAsync(values);
      setAssigned(true);
      reset();
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : 'Failed to assign.');
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <AsyncBoundary query={dashboardQuery}>{(counts) => <ReviewDashboardCounts counts={counts} />}</AsyncBoundary>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 border-t pt-4" noValidate>
        <h2 className="text-sm font-semibold">Assign a reviewer</h2>
        <FormField label="Abstract" htmlFor="assign-abstract-id" error={errors.abstractId?.message}>
          <select
            id="assign-abstract-id"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            {...register('abstractId')}
          >
            <option value="">Select an abstract…</option>
            {(abstractsQuery.data ?? []).map((abstract) => (
              <option key={abstract.id} value={abstract.id}>
                {abstract.submissionNumber ?? abstract.title} — {abstract.status}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Reviewer" htmlFor="assign-reviewer-id" error={errors.reviewerId?.message}>
          <select
            id="assign-reviewer-id"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            {...register('reviewerId')}
          >
            <option value="">Select a reviewer…</option>
            {(reviewersQuery.data ?? []).map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                User {reviewer.userId}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Due date (optional)" htmlFor="assign-due-date">
          <Input id="assign-due-date" type="date" {...register('dueDate')} />
        </FormField>
        {assignError ? (
          <p role="alert" className="text-sm text-destructive">
            {assignError}
          </p>
        ) : null}
        {assigned ? (
          <p role="status" className="text-sm text-muted-foreground">
            Assigned.
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Assigning…' : 'Assign'}
        </Button>
      </form>
    </div>
  );
}
