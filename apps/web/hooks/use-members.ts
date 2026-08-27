'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { OrganizationMember } from '@/lib/organizations/types';

export function useMembers(organizationId: string) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'members'],
    queryFn: () => apiGet<OrganizationMember[]>(`organizations/${organizationId}/members`),
    enabled: Boolean(organizationId),
  });
}

export interface InviteMemberInput {
  email: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
}

export function useInviteMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberInput) => apiPost(`organizations/${organizationId}/members`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'members'] });
    },
  });
}
