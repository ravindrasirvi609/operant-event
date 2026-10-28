'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useRecordDecision } from '@/hooks/use-decisions';
import {
  DECISION_TYPES,
  type DecisionType,
} from '@/lib/reviewers/types';

const decisionSchema = z.object({
  decision: z.enum(DECISION_TYPES),
  reason: z.string().optional(),
});

type DecisionValues = z.infer<typeof decisionSchema>;

export function DecisionForm({
  conferenceId: _conferenceId,
  abstractId,
}: {
  conferenceId: string;
  abstractId: string;
}) {
  const recordDecision = useRecordDecision(abstractId);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [recorded, setRecorded] =
    useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<DecisionValues>({
    resolver: zodResolver(decisionSchema),
  });

  const decision = watch('decision');

  async function onSubmit(values: DecisionValues) {
    setSubmitError(null);
    setRecorded(false);

    try {
      await recordDecision.mutateAsync(values);
      setRecorded(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to record decision.',
      );
    }
  }

  return (
    <div className="max-w-md">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        {/* Decision */}
        <FormField
          label="Decision"
          htmlFor="decision-type"
        >
          <Select
            value={decision}
            onValueChange={(value) => {
              if (value) {
                setValue(
                  'decision',
                  value as DecisionType,
                  {
                    shouldValidate: true,
                  },
                );
              }
            }}
          >
            <SelectTrigger
              id="decision-type"
              className="w-full"
            >
              <SelectValue placeholder="Select a decision" />
            </SelectTrigger>

            <SelectContent>
              {DECISION_TYPES.map((type) => (
                <SelectItem
                  key={type}
                  value={type}
                >
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* Reason */}
        <FormField
          label="Reason (optional)"
          htmlFor="decision-reason"
        >
          <Input
            id="decision-reason"
            placeholder="Enter a reason for this decision"
            {...register('reason')}
          />
        </FormField>

        {/* Error */}
        {submitError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {submitError}
          </p>
        ) : null}

        {/* Success */}
        {recorded ? (
          <p
            role="status"
            className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
          >
            Decision recorded successfully.
          </p>
        ) : null}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting || !decision}
        >
          {isSubmitting
            ? 'Recording…'
            : 'Record decision'}
        </Button>
      </form>
    </div>
  );
}