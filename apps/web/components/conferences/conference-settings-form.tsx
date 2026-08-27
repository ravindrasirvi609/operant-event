'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateConferenceSettings } from '@/hooks/use-conference-settings';
import { REVIEW_MODES, type ConferenceSetting, type ReviewMode } from '@/lib/conferences/types';

// Mirrors apps/api/src/conference-settings/dto/update-conference-settings.dto.ts
// exactly. Note: paymentMode, preventSpeakerOverlap, and the certificate
// threshold fields exist on ConferenceSetting but have no update endpoint
// yet — no form fields for them here, since submitting them would be
// silently stripped (or rejected under whitelist validation) by the backend.
const settingsSchema = z.object({
  abstractEnabled: z.boolean(),
  abstractStartDate: z.string().optional(),
  abstractEndDate: z.string().optional(),
  reviewEnabled: z.boolean(),
  reviewMode: z.enum(REVIEW_MODES),
  registrationEnabled: z.boolean(),
  registrationStartDate: z.string().optional(),
  registrationEndDate: z.string().optional(),
  paymentEnabled: z.boolean(),
  manualPaymentInstructions: z.string().optional(),
  certificateEnabled: z.boolean(),
  checkinEnabled: z.boolean(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

function toFormValues(settings: ConferenceSetting): SettingsValues {
  return {
    abstractEnabled: settings.abstractEnabled,
    abstractStartDate: settings.abstractStartDate?.slice(0, 10) ?? '',
    abstractEndDate: settings.abstractEndDate?.slice(0, 10) ?? '',
    reviewEnabled: settings.reviewEnabled,
    reviewMode: settings.reviewMode,
    registrationEnabled: settings.registrationEnabled,
    registrationStartDate: settings.registrationStartDate?.slice(0, 10) ?? '',
    registrationEndDate: settings.registrationEndDate?.slice(0, 10) ?? '',
    paymentEnabled: settings.paymentEnabled,
    manualPaymentInstructions: settings.manualPaymentInstructions ?? '',
    certificateEnabled: settings.certificateEnabled,
    checkinEnabled: settings.checkinEnabled,
  };
}

export function ConferenceSettingsForm({ conferenceId, settings }: { conferenceId: string; settings: ConferenceSetting }) {
  const updateSettings = useUpdateConferenceSettings(conferenceId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<SettingsValues>({ resolver: zodResolver(settingsSchema), defaultValues: toFormValues(settings) });
  const reviewMode = watch('reviewMode');

  async function onSubmit(values: SettingsValues) {
    setSaveError(null);
    try {
      await updateSettings.mutateAsync(values);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-6" noValidate>
      <section className="space-y-3 rounded-lg border p-4">
        <label htmlFor="abstract-enabled" className="flex items-center gap-2 text-sm font-medium">
          <input id="abstract-enabled" type="checkbox" className="size-4 rounded border-input" {...register('abstractEnabled')} />
          Abstract submission enabled
        </label>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Opens" htmlFor="abstract-start">
            <Input id="abstract-start" type="date" {...register('abstractStartDate')} />
          </FormField>
          <FormField label="Closes" htmlFor="abstract-end">
            <Input id="abstract-end" type="date" {...register('abstractEndDate')} />
          </FormField>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <label htmlFor="review-enabled" className="flex items-center gap-2 text-sm font-medium">
          <input id="review-enabled" type="checkbox" className="size-4 rounded border-input" {...register('reviewEnabled')} />
          Peer review enabled
        </label>
        <FormField label="Review mode" htmlFor="review-mode">
          <Select value={reviewMode} onValueChange={(value) => value && setValue('reviewMode', value as ReviewMode)}>
            <SelectTrigger id="review-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SINGLE_BLIND">Single-blind</SelectItem>
              <SelectItem value="DOUBLE_BLIND">Double-blind</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <label htmlFor="registration-enabled" className="flex items-center gap-2 text-sm font-medium">
          <input
            id="registration-enabled"
            type="checkbox"
            className="size-4 rounded border-input"
            {...register('registrationEnabled')}
          />
          Registration enabled
        </label>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Opens" htmlFor="registration-start">
            <Input id="registration-start" type="date" {...register('registrationStartDate')} />
          </FormField>
          <FormField label="Closes" htmlFor="registration-end">
            <Input id="registration-end" type="date" {...register('registrationEndDate')} />
          </FormField>
        </div>
        <label htmlFor="payment-enabled" className="flex items-center gap-2 text-sm font-medium">
          <input id="payment-enabled" type="checkbox" className="size-4 rounded border-input" {...register('paymentEnabled')} />
          Payment enabled
        </label>
        <FormField label="Manual payment instructions (shown to registrants in MANUAL mode)" htmlFor="manual-payment-instructions">
          <textarea
            id="manual-payment-instructions"
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
            rows={3}
            {...register('manualPaymentInstructions')}
          />
        </FormField>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <label htmlFor="certificate-enabled" className="flex items-center gap-2 text-sm font-medium">
          <input
            id="certificate-enabled"
            type="checkbox"
            className="size-4 rounded border-input"
            {...register('certificateEnabled')}
          />
          Certificates enabled
        </label>
        <label htmlFor="checkin-enabled" className="flex items-center gap-2 text-sm font-medium">
          <input id="checkin-enabled" type="checkbox" className="size-4 rounded border-input" {...register('checkinEnabled')} />
          Event-day check-in enabled
        </label>
      </section>

      {saveError ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  );
}
