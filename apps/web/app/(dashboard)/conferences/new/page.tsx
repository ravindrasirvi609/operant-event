'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConferenceForm, type ConferenceFormValues } from '@/components/conferences/conference-form';
import { useCreateConference } from '@/hooks/use-conferences';

export default function NewConferencePage() {
  const router = useRouter();
  const createConference = useCreateConference();
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(values: ConferenceFormValues) {
    setSubmitError(null);
    try {
      const conference = await createConference.mutateAsync(values);
      router.push(`/conferences/${conference.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create conference.');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New conference</h1>
      <ConferenceForm onSubmit={handleSubmit} submitLabel="Create conference" />
      {submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
    </div>
  );
}
