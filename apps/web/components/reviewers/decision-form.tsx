'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useRecordDecision } from '@/hooks/use-decisions';
import { useAbstractReviews } from '@/hooks/use-review-assignments';
import { DECISION_TYPES, type DecisionType } from '@/lib/reviewers/types';

const decisionSchema = z.object({
  decision: z.enum(DECISION_TYPES),
  reason: z.string().optional(),
});

type DecisionValues = z.infer<typeof decisionSchema>;

/**
 * SRS §12: final decisions must remain separate from individual
 * reviewer recommendations — this form never pre-fills from any review,
 * it only shows them as read-only context.
 */
export function DecisionForm({ conferenceId, abstractId }: { conferenceId: string; abstractId: string }) {
  const recordDecision = useRecordDecision(abstractId);
  const reviewsQuery = useAbstractReviews(conferenceId, abstractId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<DecisionValues>({ resolver: zodResolver(decisionSchema) });
  const decision = watch('decision');

  async function onSubmit(values: DecisionValues) {
    setSubmitError(null);
    try {
      await recordDecision.mutateAsync(values);
      setRecorded(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to record decision.');
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Submitted reviews</h3>
        <AsyncBoundary
          query={reviewsQuery}
          empty={<p className="text-sm text-muted-foreground">No reviewers assigned yet.</p>}
        >
          {(assignments) => (
            <ul className="space-y-2">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="rounded-lg border p-3 text-sm">
                  {assignment.review ? (
                    <div className="space-y-1">
                      <p className="font-medium">
                        Overall: {assignment.review.overallScore} — {assignment.review.recommendation}
                      </p>
                      {assignment.review.commentsToAuthor ? (
                        <p className="text-muted-foreground">To author: {assignment.review.commentsToAuthor}</p>
                      ) : null}
                      {assignment.review.privateComments ? (
                        <p className="text-muted-foreground">Private: {assignment.review.privateComments}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{assignment.status} — no review submitted yet.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </AsyncBoundary>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border-t pt-4" noValidate>
        <FormField label="Decision" htmlFor="decision-type">
          <Select value={decision} onValueChange={(value) => value && setValue('decision', value as DecisionType)}>
            <SelectTrigger id="decision-type" className="w-full">
              <SelectValue placeholder="Select a decision" />
            </SelectTrigger>
            <SelectContent>
              {DECISION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Reason (optional)" htmlFor="decision-reason">
          <Input id="decision-reason" {...register('reason')} />
        </FormField>
        {submitError ? (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        ) : null}
        {recorded ? (
          <p role="status" className="text-sm text-muted-foreground">
            Decision recorded.
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting || !decision}>
          {isSubmitting ? 'Recording…' : 'Record decision'}
        </Button>
      </form>
    </div>
  );
}
