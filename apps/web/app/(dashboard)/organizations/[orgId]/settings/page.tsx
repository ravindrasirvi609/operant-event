
'use client';

import { use, useState } from 'react';
import { OrganizationForm, organizationToFormValues, type OrganizationFormValues } from '@/components/organizations/organization-form';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  useOrganization,
  useAllOrganizations,
  useUpdateOrganization,
} from '@/hooks/use-organizations';

export default function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = use(params);
  const { data: currentUser, isPending: userPending, isError: userError } = useCurrentUser();

  const organizationQuery = useOrganization(orgId);
  const allOrganizationsQuery = useAllOrganizations();
  const updateOrganization = useUpdateOrganization(orgId);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isSuperAdmin = currentUser?.isSuperAdmin === true;

  const organization = isSuperAdmin
    ? allOrganizationsQuery.data?.find((org) => org.id === orgId)
    : organizationQuery.data;

  const isPending =
    userPending ||
    (isSuperAdmin ? allOrganizationsQuery.isPending : organizationQuery.isPending);

  const queryError = userError
    ? 'Unable to verify your account.'
    : isSuperAdmin && allOrganizationsQuery.isError
      ? allOrganizationsQuery.error.message
      : !isSuperAdmin && organizationQuery.isError
        ? organizationQuery.error.message
        : null;

  async function handleSubmit(values: OrganizationFormValues) {
    setSaveError(null);
    setSaved(false);

    try {
      await updateOrganization.mutateAsync(values);
      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to save changes.',
      );
    }
  }

  if (isPending) {
    return <p role="status">Loading organization settings...</p>;
  }

  if (queryError) {
    return (
      <div role="alert" className="space-y-2">
        <p>{queryError}</p>
      </div>
    );
  }

  if (!organization) {
    return <p>Organization not found.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Organization settings</h1>

      {isSuperAdmin ? (
        <p className="text-sm text-muted-foreground">
          Viewing organization as Super Admin. Saving changes still requires
          the backend to authorize the request.
        </p>
      ) : null}

      <OrganizationForm
        mode="update"
        defaultValues={organizationToFormValues(organization)}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
      />

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
