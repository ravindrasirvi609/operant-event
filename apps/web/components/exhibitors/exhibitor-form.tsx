
'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  useCreateExhibitor,
  useUpdateExhibitor,
} from '@/hooks/use-exhibitors';
import type { Exhibitor } from '@/lib/exhibitors/types';

const exhibitorSchema = z.object({
  companyName: z.string().trim().min(1, 'Enter a company name.'),
  boothNumber: z.string().optional(),
  contactPerson: z.string().optional(),
});

type ExhibitorValues = z.infer<typeof exhibitorSchema>;

interface ExhibitorFormProps {
  conferenceId: string;
  exhibitor?: Exhibitor;
  onCancel?: () => void;
  onSaved?: () => void;
}

export function ExhibitorForm({
  conferenceId,
  exhibitor,
  onCancel,
  onSaved,
}: ExhibitorFormProps) {
  const isEditing = Boolean(exhibitor);
  const createExhibitor = useCreateExhibitor(conferenceId);
  const updateExhibitor = useUpdateExhibitor(conferenceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExhibitorValues>({
    resolver: zodResolver(exhibitorSchema),
    defaultValues: {
      companyName: exhibitor?.companyName ?? '',
      boothNumber: exhibitor?.boothNumber ?? '',
      contactPerson: exhibitor?.contactPerson ?? '',
    },
  });

  useEffect(() => {
    reset({
      companyName: exhibitor?.companyName ?? '',
      boothNumber: exhibitor?.boothNumber ?? '',
      contactPerson: exhibitor?.contactPerson ?? '',
    });
  }, [exhibitor, reset]);

  async function onSubmit(values: ExhibitorValues) {
    const input = {
      companyName: values.companyName.trim(),
      boothNumber: values.boothNumber?.trim() || undefined,
      contactPerson: values.contactPerson?.trim() || undefined,
    };

    if (exhibitor) {
      await updateExhibitor.mutateAsync({
        exhibitorId: exhibitor.id,
        input,
      });
    } else {
      await createExhibitor.mutateAsync(input);
      reset({
        companyName: '',
        boothNumber: '',
        contactPerson: '',
      });
    }

    onSaved?.();
  }

  const isSaving =
    isSubmitting ||
    createExhibitor.isPending ||
    updateExhibitor.isPending;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full space-y-5"
      noValidate
    >
      <div>
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Edit exhibitor' : 'Add an exhibitor'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEditing
            ? 'Update the company, booth or contact details.'
            : 'Register a company participating in the exhibition.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label="Company name"
          htmlFor="exhibitor-company"
          error={errors.companyName?.message}
        >
          <Input
            id="exhibitor-company"
            placeholder="Company or organization name"
            {...register('companyName')}
          />
        </FormField>

        <FormField
          label="Booth number (optional)"
          htmlFor="exhibitor-booth"
          error={errors.boothNumber?.message}
        >
          <Input
            id="exhibitor-booth"
            placeholder="e.g. A-12"
            {...register('boothNumber')}
          />
        </FormField>

        <FormField
          label="Contact person (optional)"
          htmlFor="exhibitor-contact"
          error={errors.contactPerson?.message}
        >
          <Input
            id="exhibitor-contact"
            placeholder="Contact person's name"
            {...register('contactPerson')}
          />
        </FormField>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? 'Saving...'
            : isEditing
              ? 'Save changes'
              : 'Add exhibitor'}
        </Button>

        {isEditing && onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
