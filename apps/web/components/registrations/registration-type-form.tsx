'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useCreateRegistrationType } from '@/hooks/use-registration-categories';

const typeSchema = z.object({
  name: z.string().min(1, 'Enter a pricing window name.'),
  price: z.string().min(1, 'Enter a price.').refine((value) => Number(value) >= 0, 'Price must be zero or more.'),
  currency: z.string().min(1, 'Enter a currency code.'),
  startDate: z.string().min(1, 'Choose a start date.'),
  endDate: z.string().min(1, 'Choose an end date.'),
  capacity: z
    .string()
    .optional()
    .refine((value) => !value || Number.isInteger(Number(value)) && Number(value) >= 0, 'Capacity must be a whole number of zero or more.'),
});

type TypeValues = z.infer<typeof typeSchema>;

export function RegistrationTypeForm({ conferenceId, categoryId }: { conferenceId: string; categoryId: string }) {
  const createType = useCreateRegistrationType(conferenceId, categoryId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TypeValues>({ resolver: zodResolver(typeSchema) });

  async function onSubmit(values: TypeValues) {
    await createType.mutateAsync({
      name: values.name,
      price: Number(values.price),
      currency: values.currency,
      startDate: values.startDate,
      endDate: values.endDate,
      capacity: values.capacity ? Number(values.capacity) : undefined,
    });
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Name" htmlFor={`type-name-${categoryId}`} error={errors.name?.message}>
          <Input id={`type-name-${categoryId}`} {...register('name')} />
        </FormField>
        <FormField label="Currency" htmlFor={`type-currency-${categoryId}`} error={errors.currency?.message}>
          <Input id={`type-currency-${categoryId}`} {...register('currency')} placeholder="USD" />
        </FormField>
        <FormField label="Price" htmlFor={`type-price-${categoryId}`} error={errors.price?.message}>
          <Input id={`type-price-${categoryId}`} type="number" step="0.01" {...register('price')} />
        </FormField>
        <FormField label="Capacity (optional)" htmlFor={`type-capacity-${categoryId}`} error={errors.capacity?.message}>
          <Input id={`type-capacity-${categoryId}`} type="number" {...register('capacity')} />
        </FormField>
        <FormField label="Start date" htmlFor={`type-start-${categoryId}`} error={errors.startDate?.message}>
          <Input id={`type-start-${categoryId}`} type="date" {...register('startDate')} />
        </FormField>
        <FormField label="End date" htmlFor={`type-end-${categoryId}`} error={errors.endDate?.message}>
          <Input id={`type-end-${categoryId}`} type="date" {...register('endDate')} />
        </FormField>
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add pricing window'}
      </Button>
    </form>
  );
}
