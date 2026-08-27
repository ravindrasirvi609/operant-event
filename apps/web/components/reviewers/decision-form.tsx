'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRecordDecision } from '@/hooks/use-decisions';
import { DECISION_TYPES, type DecisionType } from '@/lib/reviewers/types';

const decisionSchema = z.object({
  decision: z.enum(DECISION_TYPES),
  reason: z.string().optional(),
});

type DecisionValues = z.infer<typeof decisionSchema>;

/**
 * SRS §12: final decisions must remain separate from individual
 * reviewer recommendations — this form never pre-fills from any review.
 * It also cannot show a summary of submitted reviews for context: no
 * endpoint anywhere returns an abstract's reviews/scores to an
 * organizer or chair (only the reviewer who submitted one, and the
 * reviewer's own `review-assignments/mine`, can see it). Disclosed
 * below rather than silently omitted.
 */
export function DecisionForm({ abstractId }: { abstractId: string }) {
  const recordDecision = useRecordDecision(abstractId);
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
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4" noValidate>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
        No endpoint exposes the individual reviews submitted for this abstract to organizers — there is
        currently no way to show them here for context.
      </div>
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
  );
}
