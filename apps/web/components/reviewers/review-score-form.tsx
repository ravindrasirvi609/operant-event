'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { REVIEW_RECOMMENDATIONS, type ReviewRecommendation } from '@/lib/reviewers/types';
import type { SubmitReviewInput } from '@/hooks/use-my-reviews';

const SCORE_DIMENSIONS = [
  { key: 'overallScore', label: 'Overall' },
  { key: 'originalityScore', label: 'Originality' },
  { key: 'methodologyScore', label: 'Methodology' },
  { key: 'significanceScore', label: 'Significance' },
  { key: 'presentationScore', label: 'Presentation' },
] as const;

const scoreSchema = z.number().int().min(1, 'Select a score.').max(5);

const reviewSchema = z.object({
  overallScore: scoreSchema,
  originalityScore: scoreSchema,
  methodologyScore: scoreSchema,
  significanceScore: scoreSchema,
  presentationScore: scoreSchema,
  commentsToAuthor: z.string().optional(),
  privateComments: z.string().optional(),
  recommendation: z.enum(REVIEW_RECOMMENDATIONS),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewScoreFormProps {
  onSubmit: (values: SubmitReviewInput) => Promise<void>;
  isSubmitting: boolean;
}

export function ReviewScoreForm({ onSubmit, isSubmitting }: ReviewScoreFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReviewFormValues>({ resolver: zodResolver(reviewSchema) });
  const recommendation = watch('recommendation');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {SCORE_DIMENSIONS.map(({ key, label }) => (
        <fieldset key={key} className="space-y-1.5">
          <legend className="text-sm font-medium">{label} (1–5)</legend>
          <div role="radiogroup" aria-label={label} className="flex gap-3">
            {[1, 2, 3, 4, 5].map((score) => (
              <label key={score} htmlFor={`${key}-${score}`} className="flex items-center gap-1 text-sm">
                <input
                  id={`${key}-${score}`}
                  type="radio"
                  value={score}
                  className="size-4"
                  {...register(key, { valueAsNumber: true })}
                />
                {score}
              </label>
            ))}
          </div>
          {errors[key] ? (
            <p role="alert" className="text-sm text-destructive">
              {errors[key]?.message}
            </p>
          ) : null}
        </fieldset>
      ))}

      <FormField label="Comments to author (visible to the author)" htmlFor="comments-to-author">
        <textarea
          id="comments-to-author"
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
          rows={4}
          {...register('commentsToAuthor')}
        />
      </FormField>
      <FormField label="Private comments (chair-only, never shown to the author)" htmlFor="private-comments">
        <textarea
          id="private-comments"
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm ring-1 ring-amber-500/30"
          rows={3}
          {...register('privateComments')}
        />
      </FormField>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Recommendation</legend>
        <div role="radiogroup" aria-label="Recommendation" className="flex flex-wrap gap-2">
          {REVIEW_RECOMMENDATIONS.map((option) => (
            <Button
              key={option}
              type="button"
              variant={recommendation === option ? 'default' : 'outline'}
              size="sm"
              onClick={() => setValue('recommendation', option as ReviewRecommendation, { shouldValidate: true })}
            >
              {option}
            </Button>
          ))}
        </div>
        {errors.recommendation ? (
          <p role="alert" className="text-sm text-destructive">
            Select a recommendation.
          </p>
        ) : null}
      </fieldset>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit review'}
      </Button>
    </form>
  );
}
