'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Pencil,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useUpdateConferenceSettings } from '@/hooks/use-conference-settings';

import {
  REVIEW_MODES,
  type ConferenceSetting,
  type ReviewMode,
} from '@/lib/conferences/types';

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function toFormValues(
  settings: ConferenceSetting,
): SettingsValues {
  return {
    abstractEnabled: settings.abstractEnabled,

    abstractStartDate:
      settings.abstractStartDate?.slice(0, 10) ?? '',

    abstractEndDate:
      settings.abstractEndDate?.slice(0, 10) ?? '',

    reviewEnabled: settings.reviewEnabled,

    reviewMode: settings.reviewMode,

    registrationEnabled: settings.registrationEnabled,

    registrationStartDate:
      settings.registrationStartDate?.slice(0, 10) ?? '',

    registrationEndDate:
      settings.registrationEndDate?.slice(0, 10) ?? '',

    paymentEnabled: settings.paymentEnabled,

    manualPaymentInstructions:
      settings.manualPaymentInstructions ?? '',

    certificateEnabled: settings.certificateEnabled,

    checkinEnabled: settings.checkinEnabled,
  };
}

function toIsoStartDate(value?: string) {
  if (!value) return undefined;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function toIsoEndDate(value?: string) {
  if (!value) return undefined;

  const date = new Date(`${value}T23:59:59.999`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function formatDate(value?: string) {
  if (!value) return 'Not configured';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not configured';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({
  enabled,
}: {
  enabled: boolean;
}) {
  return (
    <span
      className={
        enabled
          ? 'inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400'
          : 'inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground'
      }
    >
      <span
        className={
          enabled
            ? 'size-1.5 rounded-full bg-green-500'
            : 'size-1.5 rounded-full bg-muted-foreground'
        }
      />
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ConferenceSettingsForm({
  conferenceId,
  settings,
}: {
  conferenceId: string;
  settings: ConferenceSetting;
}) {
  const updateSettings =
    useUpdateConferenceSettings(conferenceId);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [saveSuccess, setSaveSuccess] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const [savedValues, setSavedValues] =
    useState<SettingsValues>(
      toFormValues(settings),
    );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: toFormValues(settings),
  });

  const reviewMode = watch('reviewMode');

  // Keep summary synchronized if the parent refreshes
  // conference settings from the API.
  useEffect(() => {
    const values = toFormValues(settings);

    setSavedValues(values);

    if (!isEditing) {
      reset(values);
    }
  }, [settings, reset, isEditing]);

  // ---------------------------------------------------------------------------
  // Open edit mode
  // ---------------------------------------------------------------------------

  function handleEdit() {
    setSaveError(null);
    setSaveSuccess(false);

    reset(savedValues);
    setIsEditing(true);
  }

  // ---------------------------------------------------------------------------
  // Cancel edit
  // ---------------------------------------------------------------------------

  function handleCancel() {
    setSaveError(null);
    setSaveSuccess(false);

    reset(savedValues);
    setIsEditing(false);
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function onSubmit(values: SettingsValues) {
    setSaveError(null);
    setSaveSuccess(false);

    const payload = {
      ...values,

      abstractStartDate: toIsoStartDate(
        values.abstractStartDate,
      ),

      abstractEndDate: toIsoEndDate(
        values.abstractEndDate,
      ),

      registrationStartDate: toIsoStartDate(
        values.registrationStartDate,
      ),

      registrationEndDate: toIsoEndDate(
        values.registrationEndDate,
      ),
    };

    try {
      await updateSettings.mutateAsync(payload);

      // Keep the newly saved values for the summary card.
      setSavedValues(values);

      setSaveSuccess(true);

      // Clear the editable form.
      reset({
        abstractEnabled: false,
        abstractStartDate: '',
        abstractEndDate: '',

        reviewEnabled: false,
        reviewMode: 'SINGLE_BLIND',

        registrationEnabled: false,
        registrationStartDate: '',
        registrationEndDate: '',

        paymentEnabled: false,
        manualPaymentInstructions: '',

        certificateEnabled: false,
        checkinEnabled: false,
      });

      // Close edit mode after successful save.
      setIsEditing(false);

      // Hide success message after 3 seconds.
      window.setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      setSaveSuccess(false);

      setSaveError(
        error instanceof Error
          ? error.message
          : 'Failed to save settings.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Saved settings summary
  // ---------------------------------------------------------------------------

  if (!isEditing) {
    return (
      <div className="w-full max-w-5xl space-y-6">
        {saveSuccess ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400"
          >
            <CheckCircle2 className="size-4 shrink-0" />
            Settings saved successfully.
          </div>
        ) : null}

        {saveError ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {saveError}
          </div>
        ) : null}

        
<section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
  {/* Header */}
  <div className="flex flex-col gap-4 border-b bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background">
        <Settings2 className="size-5 text-muted-foreground" />
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Conference Settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current configuration for submissions, review,
          registration and event services.
        </p>
      </div>
    </div>

    <Button
      type="button"
      variant="outline"
      onClick={handleEdit}
      className="shrink-0"
    >
      <Pencil className="size-4" />
      Edit settings
    </Button>
  </div>

  {/* Settings content */}
  <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 lg:grid-cols-2">
    {/* Abstract submission */}
    <div className="rounded-xl border bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-4" />
          </div>

          <div>
            <h3 className="font-semibold">Abstract Submission</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Submission window
            </p>
          </div>
        </div>

        <StatusBadge enabled={savedValues.abstractEnabled} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Opens</p>
          <p className="mt-1 text-sm font-medium">
            {formatDate(savedValues.abstractStartDate)}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Closes</p>
          <p className="mt-1 text-sm font-medium">
            {formatDate(savedValues.abstractEndDate)}
          </p>
        </div>
      </div>
    </div>

    {/* Peer review */}
    <div className="rounded-xl border bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <ShieldCheck className="size-4" />
          </div>

          <div>
            <h3 className="font-semibold">Peer Review</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Review workflow
            </p>
          </div>
        </div>

        <StatusBadge enabled={savedValues.reviewEnabled} />
      </div>

      <div className="mt-5">
        <p className="text-xs text-muted-foreground">Review mode</p>
        <p className="mt-1 text-sm font-medium">
          {savedValues.reviewMode === 'SINGLE_BLIND'
            ? 'Single-blind'
            : savedValues.reviewMode === 'DOUBLE_BLIND'
              ? 'Double-blind'
              : 'Open'}
        </p>
      </div>
    </div>

    {/* Registration - left column */}
    <div className="rounded-xl border bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <CalendarDays className="size-4" />
          </div>

          <div>
            <h3 className="font-semibold">Registration</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Registration window
            </p>
          </div>
        </div>

        <StatusBadge enabled={savedValues.registrationEnabled} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Opens</p>
          <p className="mt-1 text-sm font-medium">
            {formatDate(savedValues.registrationStartDate)}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Closes</p>
          <p className="mt-1 text-sm font-medium">
            {formatDate(savedValues.registrationEndDate)}
          </p>
        </div>
      </div>
    </div>

    {/* Event services - right column */}
    <div className="rounded-xl border bg-background p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <CheckCircle2 className="size-4" />
        </div>

        <div>
          <h3 className="font-semibold">Event Services</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Enabled services for this conference
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <StatusBadge enabled={savedValues.certificateEnabled} />
        <span className="text-sm text-muted-foreground">
          Certificates
        </span>

        <StatusBadge enabled={savedValues.checkinEnabled} />
        <span className="text-sm text-muted-foreground">
          Event-day check-in
        </span>
      </div>
    </div>

    {/* Payment - full width below both cards */}
    <div className="rounded-xl border bg-background p-5 lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <CreditCard className="size-4" />
          </div>

          <div>
            <h3 className="font-semibold">Payment</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Payment configuration
            </p>
          </div>
        </div>

        <StatusBadge enabled={savedValues.paymentEnabled} />
      </div>

      {savedValues.manualPaymentInstructions ? (
        <div className="mt-5">
          <p className="text-xs text-muted-foreground">
            Manual payment instructions
          </p>

          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
            {savedValues.manualPaymentInstructions.replace(/\*\*/g, '')}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          No manual payment instructions configured.
        </p>
      )}
    </div>
  </div>
</section>


      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Edit form
  // ---------------------------------------------------------------------------

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-5xl space-y-6"
      noValidate
    >
      {/* Form header */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">
            Update Conference Settings
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Update the conference configuration below.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </div>

      {/* Abstract submission */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <label
          htmlFor="abstract-enabled"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <input
            id="abstract-enabled"
            type="checkbox"
            className="size-4 rounded border-input"
            {...register('abstractEnabled')}
          />

          Abstract submission enabled
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Opens"
            htmlFor="abstract-start"
          >
            <Input
              id="abstract-start"
              type="date"
              {...register('abstractStartDate')}
            />
          </FormField>

          <FormField
            label="Closes"
            htmlFor="abstract-end"
          >
            <Input
              id="abstract-end"
              type="date"
              {...register('abstractEndDate')}
            />
          </FormField>
        </div>
      </section>

      {/* Peer review */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <label
          htmlFor="review-enabled"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <input
            id="review-enabled"
            type="checkbox"
            className="size-4 rounded border-input"
            {...register('reviewEnabled')}
          />

          Peer review enabled
        </label>

        <FormField
          label="Review mode"
          htmlFor="review-mode"
        >
          <Select
            value={reviewMode}
            onValueChange={(value) =>
              value &&
              setValue(
                'reviewMode',
                value as ReviewMode,
              )
            }
          >
            <SelectTrigger
              id="review-mode"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="SINGLE_BLIND">
                Single-blind
              </SelectItem>

              <SelectItem value="DOUBLE_BLIND">
                Double-blind
              </SelectItem>

              <SelectItem value="OPEN">
                Open
              </SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </section>

      {/* Registration and payment */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <label
          htmlFor="registration-enabled"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <input
            id="registration-enabled"
            type="checkbox"
            className="size-4 rounded border-input"
            {...register('registrationEnabled')}
          />

          Registration enabled
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Opens"
            htmlFor="registration-start"
          >
            <Input
              id="registration-start"
              type="date"
              {...register(
                'registrationStartDate',
              )}
            />
          </FormField>

          <FormField
            label="Closes"
            htmlFor="registration-end"
          >
            <Input
              id="registration-end"
              type="date"
              {...register(
                'registrationEndDate',
              )}
            />
          </FormField>
        </div>

        <label
          htmlFor="payment-enabled"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <input
            id="payment-enabled"
            type="checkbox"
            className="size-4 rounded border-input"
            {...register('paymentEnabled')}
          />

          Payment enabled
        </label>

        <FormField
          label="Manual payment instructions (shown to registrants in MANUAL mode)"
          htmlFor="manual-payment-instructions"
        >
          <textarea
            id="manual-payment-instructions"
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            rows={4}
            {...register(
              'manualPaymentInstructions',
            )}
          />
        </FormField>
      </section>

      {/* Certificates and check-in */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <label
          htmlFor="certificate-enabled"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <input
            id="certificate-enabled"
            type="checkbox"
            className="size-4 rounded border-input"
            {...register('certificateEnabled')}
          />

          Certificates enabled
        </label>

        <label
          htmlFor="checkin-enabled"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <input
            id="checkin-enabled"
            type="checkbox"
            className="size-4 rounded border-input"
            {...register('checkinEnabled')}
          />

          Event-day check-in enabled
        </label>
      </section>

      {/* Messages */}
      {saveSuccess ? (
        <p
          role="status"
          className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400"
        >
          Settings saved successfully.
        </p>
      ) : null}

      {saveError ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {saveError}
        </p>
      ) : null}

      {/* Save */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Saving...'
            : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}