'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useCreateExhibitor } from '@/hooks/use-exhibitors';

const exhibitorSchema = z.object({
  companyName: z.string().min(1, 'Enter a company name.'),
  boothNumber: z.string().optional(),
  contactPerson: z.string().optional(),
});

type ExhibitorValues = z.infer<typeof exhibitorSchema>;

export function ExhibitorForm({ conferenceId }: { conferenceId: string }) {
  const createExhibitor = useCreateExhibitor(conferenceId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExhibitorValues>({ resolver: zodResolver(exhibitorSchema) });

  async function onSubmit(values: ExhibitorValues) {
    await createExhibitor.mutateAsync(values);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-3" noValidate>
      <h2 className="text-sm font-semibold">Add an exhibitor</h2>
      <FormField label="Company name" htmlFor="exhibitor-company" error={errors.companyName?.message}>
        <Input id="exhibitor-company" {...register('companyName')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Booth number (optional)" htmlFor="exhibitor-booth">
          <Input id="exhibitor-booth" {...register('boothNumber')} />
        </FormField>
        <FormField label="Contact person (optional)" htmlFor="exhibitor-contact">
          <Input id="exhibitor-contact" {...register('contactPerson')} />
        </FormField>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add exhibitor'}
      </Button>
    </form>
  );
}
