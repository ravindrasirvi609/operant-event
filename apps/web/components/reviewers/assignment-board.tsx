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

import {
  useAssignReview,
  useAutoAssignReviews,
  useConflictCheck,
  useReviewDashboard,
} from '@/hooks/use-review-assignments';

import { useReviewers } from '@/hooks/use-reviewers';

const assignSchema = z.object({
  abstractId: z.string().min(1, 'Select an abstract.'),
  reviewerId: z.string().min(1, 'Select a reviewer.'),
  dueDate: z.string().optional(),
});

type AssignValues = z.infer<typeof assignSchema>;

export function AssignmentBoard({
  organizationId,
  conferenceId,
}: {
  organizationId: string;
  conferenceId: string;
}) {
  const dashboardQuery = useReviewDashboard(conferenceId);

  const abstractsQuery = useOrganizerAbstracts(conferenceId);

  const reviewersQuery = useReviewers(organizationId);

  const assignReview = useAssignReview(conferenceId);

  const autoAssignReviews = useAutoAssignReviews(conferenceId);

  const [assignmentMode, setAssignmentMode] = useState<
    'manual' | 'auto'
  >('manual');

  const [assignError, setAssignError] = useState<
    string | null
  >(null);

  const [assigned, setAssigned] = useState(false);

  const [reviewersPerAbstract, setReviewersPerAbstract] =
    useState(1);

  const [autoDueDate, setAutoDueDate] = useState('');

  const [autoAssignMessage, setAutoAssignMessage] =
    useState<string | null>(null);

  const [autoAssignError, setAutoAssignError] =
    useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<AssignValues>({
    resolver: zodResolver(assignSchema),
  });

  const selectedAbstractId = watch('abstractId');

  const selectedReviewerId = watch('reviewerId');

  const conflictQuery = useConflictCheck(
    conferenceId,
    selectedReviewerId,
    selectedAbstractId,
  );

  async function onSubmit(values: AssignValues) {
    setAssignError(null);
    setAssigned(false);

    try {
      await assignReview.mutateAsync(values);

      setAssigned(true);

      reset();
    } catch (error) {
      setAssignError(
        error instanceof Error
          ? error.message
          : 'Failed to assign.',
      );
    }
  }

  async function handleAutoAssign() {
    setAutoAssignMessage(null);
    setAutoAssignError(null);

    try {
      const result =
        await autoAssignReviews.mutateAsync({
          reviewersPerAbstract,
          ...(autoDueDate
            ? {
                dueDate: autoDueDate,
              }
            : {}),
        });

      setAutoAssignMessage(
        `${result.assigned} review assignment(s) created. ` +
          `${result.skipped} abstract(s) skipped.`,
      );

      // Reset Auto-assign form after successful assignment
      setReviewersPerAbstract(1);
      setAutoDueDate('');
    } catch (error) {
      setAutoAssignError(
        error instanceof Error
          ? error.message
          : 'Failed to auto-assign reviewers.',
      );
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* -------------------------------------------------- */}
      {/* DASHBOARD */}
      {/* -------------------------------------------------- */}

      <AsyncBoundary query={dashboardQuery}>
        {(counts) => (
          <ReviewDashboardCounts
            counts={counts}
          />
        )}
      </AsyncBoundary>

      {/* -------------------------------------------------- */}
      {/* MODE SELECTOR */}
      {/* -------------------------------------------------- */}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          type="button"
          variant={
            assignmentMode === 'manual'
              ? 'default'
              : 'outline'
          }
          onClick={() => {
            setAssignmentMode('manual');

            setAssignError(null);
            setAutoAssignError(null);
            setAutoAssignMessage(null);
          }}
        >
          Manual Assign
        </Button>

        <Button
          type="button"
          variant={
            assignmentMode === 'auto'
              ? 'default'
              : 'outline'
          }
          onClick={() => {
            setAssignmentMode('auto');

            setAssignError(null);
            setAssigned(false);
            setAutoAssignError(null);
            setAutoAssignMessage(null);
          }}
        >
          Auto-assign
        </Button>
      </div>

      {/* -------------------------------------------------- */}
      {/* MANUAL ASSIGN */}
      {/* -------------------------------------------------- */}

      {assignmentMode === 'manual' ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3"
          noValidate
        >
          <h2 className="text-sm font-semibold">
            Assign a reviewer
          </h2>

          <FormField
            label="Abstract"
            htmlFor="assign-abstract-id"
            error={errors.abstractId?.message}
          >
            <select
              id="assign-abstract-id"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              {...register('abstractId')}
            >
              <option value="">
                Select an abstract…
              </option>

              {(abstractsQuery.data ?? []).map(
                (abstract) => (
                  <option
                    key={abstract.id}
                    value={abstract.id}
                  >
                    {abstract.submissionNumber ??
                      abstract.title}{' '}
                    — {abstract.status}
                  </option>
                ),
              )}
            </select>
          </FormField>

          <FormField
            label="Reviewer"
            htmlFor="assign-reviewer-id"
            error={errors.reviewerId?.message}
          >
            <select
              id="assign-reviewer-id"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              {...register('reviewerId')}
            >
              <option value="">
                Select a reviewer…
              </option>

              {(reviewersQuery.data ?? []).map(
  (reviewer) => {
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
      <option
        key={reviewer.id}
        value={reviewer.id}
      >
        {displayName}
        {reviewer.user?.email
          ? ` — ${reviewer.user.email}`
          : ''}
      </option>
    );
  },
)}
            </select>
          </FormField>

          <FormField
            label="Due date (optional)"
            htmlFor="assign-due-date"
          >
            <Input
              id="assign-due-date"
              type="date"
              {...register('dueDate')}
            />
          </FormField>

          {/* Conflict warning */}

          {conflictQuery.data?.hasConflict ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              Conflict of interest:{' '}
              {conflictQuery.data.reasons}
            </p>
          ) : null}

          {assignError ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {assignError}
            </p>
          ) : null}

          {assigned ? (
            <p
              role="status"
              className="text-sm text-muted-foreground"
            >
              Reviewer assigned successfully.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={
              isSubmitting ||
              assignReview.isPending
            }
          >
            {isSubmitting ||
            assignReview.isPending
              ? 'Assigning…'
              : 'Assign'}
          </Button>
        </form>
      ) : (
        /* -------------------------------------------------- */
        /* AUTO ASSIGN */
        /* -------------------------------------------------- */

        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold">
              Auto-assign reviewers
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Automatically distribute eligible abstracts
              evenly among active reviewers. Existing
              assignments and conflicts of interest are
              skipped.
            </p>
          </div>

          <FormField
            label="Reviewers per abstract"
            htmlFor="reviewers-per-abstract"
          >
            <select
              id="reviewers-per-abstract"
              value={reviewersPerAbstract}
              onChange={(event) =>
                setReviewersPerAbstract(
                  Number(event.target.value),
                )
              }
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value={1}>
                1 reviewer
              </option>

              <option value={2}>
                2 reviewers
              </option>

              <option value={3}>
                3 reviewers
              </option>
            </select>
          </FormField>

          <FormField
            label="Due date (optional)"
            htmlFor="auto-assign-due-date"
          >
            <Input
              id="auto-assign-due-date"
              type="date"
              value={autoDueDate}
              onChange={(event) =>
                setAutoDueDate(
                  event.target.value,
                )
              }
            />
          </FormField>

          {autoAssignError ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {autoAssignError}
            </p>
          ) : null}

          {autoAssignMessage ? (
            <p
              role="status"
              className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-700 dark:text-green-400"
            >
              {autoAssignMessage}
            </p>
          ) : null}

          <Button
            type="button"
            onClick={handleAutoAssign}
            disabled={
              autoAssignReviews.isPending
            }
          >
            {autoAssignReviews.isPending
              ? 'Assigning…'
              : 'Auto-assign reviewers'}
          </Button>
        </div>
      )}
    </div>
  );
}