'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useCreateRegistrationCategory } from '@/hooks/use-registration-categories';

const categorySchema = z.object({
  name: z.string().min(1, 'Enter a category name.'),
  description: z.string().optional(),
});

type CategoryValues = z.infer<typeof categorySchema>;

export function RegistrationCategoryForm({ conferenceId }: { conferenceId: string }) {
  const createCategory = useCreateRegistrationCategory(conferenceId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryValues>({ resolver: zodResolver(categorySchema) });

  async function onSubmit(values: CategoryValues) {
    await createCategory.mutateAsync(values);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-3" noValidate>
      <h2 className="text-sm font-semibold">Add a registration category</h2>
      <FormField label="Name" htmlFor="category-name" error={errors.name?.message}>
        <Input id="category-name" {...register('name')} />
      </FormField>
      <FormField label="Description (optional)" htmlFor="category-description" error={errors.description?.message}>
        <Input id="category-description" {...register('description')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add category'}
      </Button>
    </form>
  );
}
