'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api/client';
import type { Organization, OrganizationStatus, OrganizationWithMemberCount } from '@/lib/organizations/types';

const ORGANIZATIONS_QUERY_KEY = ['organizations', 'me'];
const ALL_ORGANIZATIONS_QUERY_KEY = ['organizations', 'all'];

export function useOrganizations() {
  return useQuery({
    queryKey: ORGANIZATIONS_QUERY_KEY,
    queryFn: () => apiGet<Organization[]>('organizations/me'),
  });
}

/**
 * No `GET organizations/:id` endpoint exists — the only source of a
 * single organization's data is the `organizations/me` list, so this
 * derives from the same cached query (via `select`, which keeps the
 * result a properly-typed `UseQueryResult<Organization | undefined>`
 * instead of hand-spreading a discriminated union) rather than making a
 * second call.
 */
export function useOrganization(organizationId: string) {
  return useQuery({
    queryKey: ORGANIZATIONS_QUERY_KEY,
    queryFn: () => apiGet<Organization[]>('organizations/me'),
    select: (organizations) => organizations.find((organization) => organization.id === organizationId),
  });
}

export function useMyPermissions(organizationId: string) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'me', 'permissions'],
    queryFn: () => apiGet<string[]>(`organizations/${organizationId}/me/permissions`),
    enabled: Boolean(organizationId),
  });
}

export interface UpdateOrganizationInput {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
}

export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) => apiPatch(`organizations/${organizationId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
    },
  });
}

/**
 * Platform Super Admin only — every organization on the platform, not just
 * the caller's own (apps/api gates GET /organizations with SuperAdminGuard;
 * a regular user calling this gets a 403, so only render it behind an
 * isSuperAdmin check).
 */
export function useAllOrganizations() {
  return useQuery({
    queryKey: ALL_ORGANIZATIONS_QUERY_KEY,
    queryFn: () => apiGet<OrganizationWithMemberCount[]>('organizations'),
  });
}

/** Platform Super Admin only — activates or suspends an organization. */
export function useUpdateOrganizationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, status }: { organizationId: string; status: OrganizationStatus }) =>
      apiPatch<Organization>(`organizations/${organizationId}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ALL_ORGANIZATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
    },
  });
}
