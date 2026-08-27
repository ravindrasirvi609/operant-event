'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useCreateSpeaker } from '@/hooks/use-speakers';

const speakerSchema = z.object({
  name: z.string().min(1, 'Enter a name.'),
  designation: z.string().optional(),
  institution: z.string().optional(),
  country: z.string().optional(),
  bio: z.string().optional(),
});

type SpeakerValues = z.infer<typeof speakerSchema>;

export function SpeakerForm({ conferenceId }: { conferenceId: string }) {
  const createSpeaker = useCreateSpeaker(conferenceId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SpeakerValues>({ resolver: zodResolver(speakerSchema) });

  async function onSubmit(values: SpeakerValues) {
    await createSpeaker.mutateAsync(values);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-3" noValidate>
      <h2 className="text-sm font-semibold">Add a speaker</h2>
      <FormField label="Name" htmlFor="speaker-name" error={errors.name?.message}>
        <Input id="speaker-name" {...register('name')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Designation (optional)" htmlFor="speaker-designation">
          <Input id="speaker-designation" {...register('designation')} />
        </FormField>
        <FormField label="Institution (optional)" htmlFor="speaker-institution">
          <Input id="speaker-institution" {...register('institution')} />
        </FormField>
      </div>
      <FormField label="Country (optional)" htmlFor="speaker-country">
        <Input id="speaker-country" {...register('country')} />
      </FormField>
      <FormField label="Bio (optional)" htmlFor="speaker-bio">
        <Input id="speaker-bio" {...register('bio')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add speaker'}
      </Button>
    </form>
  );
}
