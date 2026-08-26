'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { OrganizationForm, type OrganizationFormValues } from '@/components/organizations/organization-form';
import { apiPost } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import type { Organization } from '@/lib/organizations/types';

export default function NewOrganizationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setActiveOrganization } = useActiveOrganization();
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(values: OrganizationFormValues) {
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Create an organization</h1>
      <OrganizationForm mode="create" onSubmit={handleSubmit} submitLabel="Create organization" />
      {submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
    </div>
  );
}
