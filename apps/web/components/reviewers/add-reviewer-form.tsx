'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useAddReviewer } from '@/hooks/use-reviewers';

const addReviewerSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

type AddReviewerValues = z.infer<typeof addReviewerSchema>;

export function AddReviewerForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const addReviewer = useAddReviewer(organizationId);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddReviewerValues>({
    resolver: zodResolver(addReviewerSchema),
  });

  async function onSubmit(values: AddReviewerValues) {
    setSubmitError(null);
    setIsConflict(false);

    try {
      await addReviewer.mutateAsync({
        email: values.email,
      });

      reset();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to add reviewer.';

      /*
       * The backend can return a generic "Conflict" response
       * when the user is already a reviewer.
       *
       * Convert that technical message into a clear
       * user-facing message.
       */
      const normalizedMessage = message.toLowerCase();

      const alreadyReviewer =
        normalizedMessage.includes('conflict') ||
        normalizedMessage.includes('already exists') ||
        normalizedMessage.includes('already a reviewer') ||
        normalizedMessage.includes('reviewer already exists');

      if (alreadyReviewer) {
        setIsConflict(true);
        setSubmitError(
          'Reviewer already exists for this organization.',
        );
        return;
      }

      setSubmitError(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-sm space-y-3"
      noValidate
    >
      <FormField
        label="Email"
        htmlFor="reviewer-email"
        error={errors.email?.message}
      >
        <Input
          id="reviewer-email"
          type="email"
          {...register('email', {
            onChange: () => {
              setSubmitError(null);
              setIsConflict(false);
            },
          })}
        />
      </FormField>

      {submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting || isConflict}
      >
        {isSubmitting ? 'Adding…' : 'Add reviewer'}
      </Button>
    </form>
  );
}