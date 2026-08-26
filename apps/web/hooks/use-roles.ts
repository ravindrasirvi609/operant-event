'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { Role } from '@/lib/organizations/types';

export function useRoles(organizationId: string) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'roles'],
    queryFn: () => apiGet<Role[]>(`organizations/${organizationId}/roles`),
    enabled: Boolean(organizationId),
  });
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: string[];
}

export function useCreateRole(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => apiPost<Role>(`organizations/${organizationId}/roles`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'roles'] });
    },
  });
}
