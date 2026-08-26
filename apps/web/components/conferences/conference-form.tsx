'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listTimezones } from '@/lib/conferences/timezones';
import type { Conference } from '@/lib/conferences/types';

// Mirrors apps/api/src/conferences/dto/create-conference.dto.ts /
// update-conference.dto.ts.
const conferenceSchema = z.object({
  name: z.string().min(1, 'Enter a conference name.'),
  shortName: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Select a start date.'),
  endDate: z.string().min(1, 'Select an end date.'),
  timezone: z.string().min(1, 'Select a timezone.'),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.union([z.literal(''), z.string().url('Enter a valid URL.')]).optional(),
  contactEmail: z.union([z.literal(''), z.string().email('Enter a valid email address.')]).optional(),
});

export type ConferenceFormValues = z.infer<typeof conferenceSchema>;

interface ConferenceFormProps {
  defaultValues?: Partial<ConferenceFormValues>;
  onSubmit: (values: ConferenceFormValues) => Promise<void>;
  submitLabel: string;
}

export function ConferenceForm({ defaultValues, onSubmit, submitLabel }: ConferenceFormProps) {
  const timezones = useMemo(() => listTimezones(), []);
  const [timezoneFilter, setTimezoneFilter] = useState('');
  const filteredTimezones = useMemo(
    () => timezones.filter((tz) => tz.toLowerCase().includes(timezoneFilter.toLowerCase())),
    [timezones, timezoneFilter],
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConferenceFormValues>({
    resolver: zodResolver(conferenceSchema),
    defaultValues: { timezone: 'UTC', ...defaultValues },
  });
  const timezone = watch('timezone');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4" noValidate>
      <FormField label="Conference name" htmlFor="conf-name" error={errors.name?.message}>
        <Input id="conf-name" {...register('name')} />
      </FormField>
      <FormField label="Short name (optional)" htmlFor="conf-short-name" error={errors.shortName?.message}>
        <Input id="conf-short-name" {...register('shortName')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start date" htmlFor="conf-start-date" error={errors.startDate?.message}>
          <Input id="conf-start-date" type="date" {...register('startDate')} />
        </FormField>
        <FormField label="End date" htmlFor="conf-end-date" error={errors.endDate?.message}>
          <Input id="conf-end-date" type="date" {...register('endDate')} />
        </FormField>
      </div>
      <FormField label="Timezone" htmlFor="conf-timezone" error={errors.timezone?.message}>
        <Select value={timezone} onValueChange={(value) => value && setValue('timezone', value, { shouldValidate: true })}>
          <SelectTrigger id="conf-timezone" className="w-full">
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent>
            <div className="p-1">
              <Input
                placeholder="Search timezones…"
                value={timezoneFilter}
                onChange={(event) => setTimezoneFilter(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
            {filteredTimezones.slice(0, 100).map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Description (optional)" htmlFor="conf-description" error={errors.description?.message}>
        <Input id="conf-description" {...register('description')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Venue name (optional)" htmlFor="conf-venue-name" error={errors.venueName?.message}>
          <Input id="conf-venue-name" {...register('venueName')} />
        </FormField>
        <FormField label="Venue address (optional)" htmlFor="conf-venue-address" error={errors.venueAddress?.message}>
          <Input id="conf-venue-address" {...register('venueAddress')} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="City (optional)" htmlFor="conf-city" error={errors.city?.message}>
          <Input id="conf-city" {...register('city')} />
        </FormField>
        <FormField label="Country (optional)" htmlFor="conf-country" error={errors.country?.message}>
          <Input id="conf-country" {...register('country')} />
        </FormField>
      </div>
      <FormField label="Website (optional)" htmlFor="conf-website" error={errors.website?.message}>
        <Input id="conf-website" type="url" placeholder="https://" {...register('website')} />
      </FormField>
      <FormField label="Contact email (optional)" htmlFor="conf-contact-email" error={errors.contactEmail?.message}>
        <Input id="conf-contact-email" type="email" {...register('contactEmail')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

export function conferenceToFormValues(conference: Conference): ConferenceFormValues {
  return {
    name: conference.name,
    shortName: conference.shortName ?? '',
    description: conference.description ?? '',
    startDate: conference.startDate.slice(0, 10),
    endDate: conference.endDate.slice(0, 10),
    timezone: conference.timezone,
    venueName: conference.venueName ?? '',
    venueAddress: conference.venueAddress ?? '',
    city: conference.city ?? '',
    country: conference.country ?? '',
    website: conference.website ?? '',
    contactEmail: conference.contactEmail ?? '',
  };
}
