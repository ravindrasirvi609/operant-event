'use client';

import { use, useState } from 'react';
import { OrganizationForm, organizationToFormValues, type OrganizationFormValues } from '@/components/organizations/organization-form';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useOrganization, useUpdateOrganization } from '@/hooks/use-organizations';

export default function OrganizationSettingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const organizationQuery = useOrganization(orgId);
  const updateOrganization = useUpdateOrganization(orgId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(values: OrganizationFormValues) {
    setSaveError(null);
    setSaved(false);
    try {
      await updateOrganization.mutateAsync(values);
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save.');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Organization settings</h1>
      <AsyncBoundary
        query={organizationQuery}
        isEmpty={(organization) => !organization}
        empty={<p className="text-sm text-muted-foreground">Organization not found.</p>}
      >
        {(organization) => (
          <OrganizationForm
            mode="update"
            defaultValues={organizationToFormValues(organization!)}
            onSubmit={handleSubmit}
            submitLabel="Save changes"
          />
        )}
      </AsyncBoundary>
      {saved ? (
        <p role="status" className="text-sm text-muted-foreground">
          Saved.
        </p>
      ) : null}
      {saveError ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
