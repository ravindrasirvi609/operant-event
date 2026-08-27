'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateSponsor } from '@/hooks/use-sponsors';
import { SPONSOR_TIERS, type SponsorTier } from '@/lib/sponsors/types';

const sponsorSchema = z.object({
  name: z.string().min(1, 'Enter a sponsor name.'),
  tier: z.enum(SPONSOR_TIERS),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Enter a valid email address.').optional().or(z.literal('')),
});

type SponsorValues = z.infer<typeof sponsorSchema>;

/** `paymentStatus` has no field here — it's always PENDING at creation, only editable via the table's PATCH afterward. */
export function SponsorForm({ conferenceId }: { conferenceId: string }) {
  const createSponsor = useCreateSponsor(conferenceId);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SponsorValues>({ resolver: zodResolver(sponsorSchema), defaultValues: { tier: 'BRONZE' } });
  const tier = watch('tier');

  async function onSubmit(values: SponsorValues) {
    await createSponsor.mutateAsync({ ...values, contactEmail: values.contactEmail || undefined });
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-3" noValidate>
      <h2 className="text-sm font-semibold">Add a sponsor</h2>
      <FormField label="Name" htmlFor="sponsor-name" error={errors.name?.message}>
        <Input id="sponsor-name" {...register('name')} />
      </FormField>
      <FormField label="Tier" htmlFor="sponsor-tier">
        <Select value={tier} onValueChange={(value) => value && setValue('tier', value as SponsorTier)}>
          <SelectTrigger id="sponsor-tier" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPONSOR_TIERS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Contact name (optional)" htmlFor="sponsor-contact-name">
          <Input id="sponsor-contact-name" {...register('contactName')} />
        </FormField>
        <FormField label="Contact email (optional)" htmlFor="sponsor-contact-email" error={errors.contactEmail?.message}>
          <Input id="sponsor-contact-email" type="email" {...register('contactEmail')} />
        </FormField>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add sponsor'}
      </Button>
    </form>
  );
}
