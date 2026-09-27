'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiPost } from '@/lib/api/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import type { Organization } from '@/lib/organizations/types';

// ─── schema ──────────────────────────────────────────────────────────────────
// Mirrors apps/api/src/organizations/dto/create-organization.dto.ts exactly.

const schema = z.object({
  // Organization details
  name: z.string().min(1, 'Enter an organization name.'),
  slug: z.string().optional(),
  contactEmail: z.union([z.literal(''), z.string().email('Enter a valid email address.')]).optional(),
  contactPhone: z.string().optional(),
  website: z.union([z.literal(''), z.string().url('Enter a valid URL.')]).optional(),
  // Owner provisioning
  ownerEmail: z.string().email('Enter a valid email address for the owner.'),
  ownerFirstName: z.string().min(1, "Enter the owner's first name."),
  ownerLastName: z.string().min(1, "Enter the owner's last name."),
});

type FormValues = z.infer<typeof schema>;

// ─── page ─────────────────────────────────────────────────────────────────────

export default function NewOrganizationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setActiveOrganization } = useActiveOrganization();
  const { data: currentUser, isLoading } = useCurrentUser();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Redirect non-Super Admins — this route is platform-admin only.
  useEffect(() => {
    if (!isLoading && currentUser && !currentUser.isSuperAdmin) {
      router.replace('/');
    }
  }, [currentUser, isLoading, router]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const organization = await apiPost<Organization>('organizations', values);
      await queryClient.invalidateQueries({ queryKey: ['organizations', 'me'] });
      setActiveOrganization(organization.id);
      router.push('/');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create organization.');
    }
  }

  // Render nothing while confirming Super Admin status or during the redirect.
  if (isLoading || !currentUser?.isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create an organization</h1>
        <p className="text-sm text-muted-foreground">
          Provision a new organization and designate its first owner. If the owner does not
          yet have an account, one will be created and they will receive a set-password email.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4" noValidate>
        {/* ── Organization details ──────────────────────────────────────────── */}
        <FormField label="Organization name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" {...register('name')} />
        </FormField>
        <FormField label="Slug (optional)" htmlFor="slug" error={errors.slug?.message}>
          <Input id="slug" placeholder="auto-generated if left blank" {...register('slug')} />
        </FormField>
        <FormField label="Contact email" htmlFor="contactEmail" error={errors.contactEmail?.message}>
          <Input id="contactEmail" type="email" {...register('contactEmail')} />
        </FormField>
        <FormField label="Contact phone" htmlFor="contactPhone" error={errors.contactPhone?.message}>
          <Input id="contactPhone" {...register('contactPhone')} />
        </FormField>
        <FormField label="Website" htmlFor="website" error={errors.website?.message}>
          <Input id="website" type="url" placeholder="https://" {...register('website')} />
        </FormField>

        {/* ── Owner provisioning ───────────────────────────────────────────── */}
        <fieldset className="space-y-4 rounded-xl border border-border px-4 pb-4 pt-3">
          <legend className="px-1 text-sm font-medium text-muted-foreground">
            Organization Owner account
          </legend>
          <p className="text-[0.8125rem] text-muted-foreground">
            If no account exists for this email, one will be created and a set-password
            link will be sent automatically.
          </p>
          <FormField label="Owner email" htmlFor="ownerEmail" error={errors.ownerEmail?.message}>
            <Input id="ownerEmail" type="email" {...register('ownerEmail')} />
          </FormField>
          <FormField label="Owner first name" htmlFor="ownerFirstName" error={errors.ownerFirstName?.message}>
            <Input id="ownerFirstName" {...register('ownerFirstName')} />
          </FormField>
          <FormField label="Owner last name" htmlFor="ownerLastName" error={errors.ownerLastName?.message}>
            <Input id="ownerLastName" {...register('ownerLastName')} />
          </FormField>
        </fieldset>

        {/* ── Error + submit ─────────────────────────────────────────────────── */}
        {submitError ? (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create organization'}
        </Button>
      </form>
    </div>
  );
}
