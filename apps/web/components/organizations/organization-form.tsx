'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import type { Organization } from '@/lib/organizations/types';

// Mirrors apps/api/src/organizations/dto/create-organization.dto.ts /
// update-organization.dto.ts. `slug` is create-only — the update DTO
// doesn't accept it at all.
const baseSchema = {
  name: z.string().min(1, 'Enter an organization name.'),
  contactEmail: z.union([z.literal(''), z.string().email('Enter a valid email address.')]).optional(),
  contactPhone: z.string().optional(),
  website: z.union([z.literal(''), z.string().url('Enter a valid URL.')]).optional(),
};

const createSchema = z.object({
  ...baseSchema,
  slug: z.string().optional(),
});

const updateSchema = z.object(baseSchema);

export type OrganizationFormValues = z.infer<typeof createSchema>;

interface OrganizationFormProps {
  mode: 'create' | 'update';
  defaultValues?: Partial<OrganizationFormValues>;
  onSubmit: (values: OrganizationFormValues) => Promise<void>;
  submitLabel: string;
}

export function OrganizationForm({ mode, defaultValues, onSubmit, submitLabel }: OrganizationFormProps) {
  const schema = mode === 'create' ? createSchema : updateSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4" noValidate>
      <FormField label="Organization name" htmlFor="name" error={errors.name?.message}>
        <Input id="name" {...register('name')} />
      </FormField>
      {mode === 'create' ? (
        <FormField label="Slug (optional)" htmlFor="slug" error={errors.slug?.message}>
          <Input id="slug" placeholder="auto-generated if left blank" {...register('slug')} />
        </FormField>
      ) : null}
      <FormField label="Contact email" htmlFor="contactEmail" error={errors.contactEmail?.message}>
        <Input id="contactEmail" type="email" {...register('contactEmail')} />
      </FormField>
      <FormField label="Contact phone" htmlFor="contactPhone" error={errors.contactPhone?.message}>
        <Input id="contactPhone" {...register('contactPhone')} />
      </FormField>
      <FormField label="Website" htmlFor="website" error={errors.website?.message}>
        <Input id="website" type="url" placeholder="https://" {...register('website')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

export function organizationToFormValues(organization: Organization): OrganizationFormValues {
  return {
    name: organization.name,
    contactEmail: organization.contactEmail ?? '',
    contactPhone: organization.contactPhone ?? '',
    website: organization.website ?? '',
  };
}
