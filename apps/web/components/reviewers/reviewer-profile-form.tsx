'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useUpdateReviewerProfile } from '@/hooks/use-reviewers';
import type { ReviewerProfile } from '@/lib/reviewers/types';

interface ProfileFormValues {
  institution: string;
  designation: string;
  bio: string;
  expertiseCsv: string;
  keywordsCsv: string;
}

function toFormValues(profile: ReviewerProfile | null): ProfileFormValues {
  return {
    institution: profile?.institution ?? '',
    designation: profile?.designation ?? '',
    bio: profile?.bio ?? '',
    expertiseCsv: (profile?.expertise ?? []).join(', '),
    keywordsCsv: (profile?.keywords ?? []).join(', '),
  };
}

function toCsvArray(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ReviewerProfileForm({
  organizationId,
  reviewerId,
  profile,
}: {
  organizationId: string;
  reviewerId: string;
  profile: ReviewerProfile | null;
}) {
  const updateProfile = useUpdateReviewerProfile(organizationId);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ProfileFormValues>({
    defaultValues: toFormValues(profile),
  });

  async function onSubmit(values: ProfileFormValues) {
    setSaved(false);
    setSaveError(null);
    try {
      await updateProfile.mutateAsync({
        reviewerId,
        input: {
          institution: values.institution || undefined,
          designation: values.designation || undefined,
          bio: values.bio || undefined,
          expertise: toCsvArray(values.expertiseCsv),
          keywords: toCsvArray(values.keywordsCsv),
        },
      });
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-3" noValidate>
      <FormField label="Institution" htmlFor={`profile-institution-${reviewerId}`}>
        <Input id={`profile-institution-${reviewerId}`} {...register('institution')} />
      </FormField>
      <FormField label="Designation" htmlFor={`profile-designation-${reviewerId}`}>
        <Input id={`profile-designation-${reviewerId}`} {...register('designation')} />
      </FormField>
      <FormField label="Bio" htmlFor={`profile-bio-${reviewerId}`}>
        <Input id={`profile-bio-${reviewerId}`} {...register('bio')} />
      </FormField>
      <FormField label="Expertise (comma-separated)" htmlFor={`profile-expertise-${reviewerId}`}>
        <Input id={`profile-expertise-${reviewerId}`} {...register('expertiseCsv')} />
      </FormField>
      <FormField label="Keywords (comma-separated)" htmlFor={`profile-keywords-${reviewerId}`}>
        <Input id={`profile-keywords-${reviewerId}`} {...register('keywordsCsv')} />
      </FormField>
      {saveError ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-muted-foreground">
          Saved.
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
