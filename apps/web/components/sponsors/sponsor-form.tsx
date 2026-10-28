'use client';

import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import {
  useCreateSponsor,
  useUpdateSponsor,
} from '@/hooks/use-sponsors';
import {
  SPONSOR_TIERS,
  type Sponsor,
  type SponsorTier,
} from '@/lib/sponsors/types';
import { uploadFileToOrganization } from '@/lib/api/upload-file';

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const sponsorSchema = z.object({
  name: z.string().trim().min(1, 'Enter a sponsor name.'),
  tier: z.enum(SPONSOR_TIERS),
  contactName: z.string().optional(),
  contactEmail: z
    .string()
    .email('Enter a valid email address.')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Enter a complete URL, including https://.')
    .optional()
    .or(z.literal('')),
  notes: z.string().optional(),
});

type SponsorValues = z.infer<typeof sponsorSchema>;

interface SponsorFormProps {
  conferenceId: string;
  sponsor?: Sponsor;
  onCancel?: () => void;
  onSaved?: () => void;
}

export function SponsorForm({
  conferenceId,
  sponsor,
  onCancel,
  onSaved,
}: SponsorFormProps) {
  const isEditing = Boolean(sponsor);

  const createSponsor = useCreateSponsor(conferenceId);
  const updateSponsor = useUpdateSponsor(conferenceId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SponsorValues>({
    resolver: zodResolver(sponsorSchema),
    defaultValues: {
      name: sponsor?.name ?? '',
      tier: sponsor?.tier ?? 'BRONZE',
      contactName: sponsor?.contactName ?? '',
      contactEmail: sponsor?.contactEmail ?? '',
      website: sponsor?.website ?? '',
      notes: sponsor?.notes ?? '',
    },
  });

  const tier = watch('tier');

  useEffect(() => {
    reset({
      name: sponsor?.name ?? '',
      tier: sponsor?.tier ?? 'BRONZE',
      contactName: sponsor?.contactName ?? '',
      contactEmail: sponsor?.contactEmail ?? '',
      website: sponsor?.website ?? '',
      notes: sponsor?.notes ?? '',
    });

    setLogoFile(null);
    setLogoError('');
    setLogoPreview('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [sponsor, reset]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview('');
      return;
    }

    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [logoFile]);

  function handleLogoChange(file?: File) {
    setLogoError('');
    setLogoFile(null);

    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Choose a PNG, JPEG, or WebP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size <= 0 || file.size > MAX_LOGO_SIZE) {
      setLogoError('Logo must be greater than 0 and no larger than 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLogoFile(file);
  }

  function removeSelectedLogo() {
    setLogoFile(null);
    setLogoError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function onSubmit(values: SponsorValues) {
    setLogoError('');
    setIsUploading(true);

    try {
      let logoFileId: string | undefined;

      if (logoFile) {
        logoFileId = await uploadFileToOrganization(logoFile);
      }

      const input = {
        ...values,
        contactName: values.contactName?.trim() || undefined,
        contactEmail: values.contactEmail?.trim() || undefined,
        website: values.website?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        ...(logoFileId ? { logoFileId } : {}),
      };

      if (sponsor) {
        await updateSponsor.mutateAsync({
          sponsorId: sponsor.id,
          input,
        });
      } else {
        await createSponsor.mutateAsync(input);
      }

      if (!sponsor) {
        reset({
          name: '',
          tier: 'BRONZE',
          contactName: '',
          contactEmail: '',
          website: '',
          notes: '',
        });

        removeSelectedLogo();
      }

      onSaved?.();
    } catch (error) {
      setLogoError(
        error instanceof Error
          ? error.message
          : 'Could not save sponsor details or upload the logo.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  const isSaving =
    isSubmitting ||
    isUploading ||
    createSponsor.isPending ||
    updateSponsor.isPending;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-3xl space-y-5"
      noValidate
    >
      <div>
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Edit sponsor' : 'Add a sponsor'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEditing
            ? 'Update sponsor details or upload a replacement logo.'
            : 'Enter sponsor details and optionally upload their logo.'}
        </p>
      </div>

      <FormField
        label="Company / sponsor name"
        htmlFor="sponsor-name"
        error={errors.name?.message}
      >
        <Input id="sponsor-name" {...register('name')} />
      </FormField>

      <FormField label="Sponsorship tier" htmlFor="sponsor-tier">
        <Select
          value={tier}
          onValueChange={(value) => {
            if (value) setValue('tier', value as SponsorTier);
          }}
        >
          <SelectTrigger id="sponsor-tier" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPONSOR_TIERS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="space-y-2">
        <label htmlFor="sponsor-logo" className="block text-sm font-medium">
          Sponsor logo (optional)
        </label>

        {isEditing && sponsor?.logoFileId && !logoFile && (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/proxy/files/${encodeURIComponent(sponsor.logoFileId)}/preview`}
              alt={`${sponsor.name} current logo`}
              className="h-16 w-20 rounded-md border bg-white object-contain p-1"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">Current logo</p>
              <p className="text-xs text-muted-foreground">
                Select another image below to replace it.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-dashed border-input bg-muted/20 p-4 sm:p-5">
          <p className="text-sm font-medium">Upload sponsor logo</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPEG or WebP. Maximum file size: 5 MB.
          </p>

          <input
            ref={fileInputRef}
            id="sponsor-logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) =>
              handleLogoChange(event.target.files?.[0])
            }
            className="mt-4 block w-full cursor-pointer rounded-lg border border-input bg-background text-sm
              file:mr-3 file:cursor-pointer file:border-0 file:bg-muted
              file:px-4 file:py-3 file:font-medium hover:file:bg-accent"
          />

          {logoFile && (
            <div className="mt-4 flex min-w-0 items-center gap-3 rounded-lg border bg-background p-3">
              {logoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt="Selected sponsor logo preview"
                  className="h-14 w-14 shrink-0 rounded-md border bg-white object-contain p-1"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-medium">
                  {logoFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(logoFile.size / 1024).toFixed(0)} KB
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeSelectedLogo}
              >
                Cancel file
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Contact name (optional)" htmlFor="sponsor-contact-name">
          <Input id="sponsor-contact-name" {...register('contactName')} />
        </FormField>

        <FormField
          label="Contact email (optional)"
          htmlFor="sponsor-contact-email"
          error={errors.contactEmail?.message}
        >
          <Input
            id="sponsor-contact-email"
            type="email"
            {...register('contactEmail')}
          />
        </FormField>
      </div>

      <FormField
        label="Website (optional)"
        htmlFor="sponsor-website"
        error={errors.website?.message}
      >
        <Input
          id="sponsor-website"
          type="url"
          placeholder="https://example.com"
          {...register('website')}
        />
      </FormField>

      <FormField label="Internal notes (optional)" htmlFor="sponsor-notes">
        <textarea
          id="sponsor-notes"
          rows={4}
          placeholder="Organizer-only notes"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          {...register('notes')}
        />
      </FormField>

      {logoError && (
        <p role="alert" className="text-sm text-destructive">
          {logoError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? 'Saving sponsor...'
            : isEditing
              ? 'Save changes'
              : 'Add sponsor'}
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