'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api/client';
import type { Organization } from '@/lib/organizations/types';

const ORGANIZATIONS_QUERY_KEY = ['organizations', 'me'];

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
