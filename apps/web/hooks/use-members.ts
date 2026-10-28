
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import type { OrganizationMember } from '@/lib/organizations/types';

const membersQueryKey = (organizationId: string) => [
  'organizations',
  organizationId,
  'members',
] as const;

export interface UpdateMembershipInput {
  status?: 'ACTIVE' | 'DEACTIVATED';
  roleIds?: string[];
}

export interface InviteMemberInput {
  email: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
}

/** Fetch members belonging to the selected organization. */
export function useMembers(organizationId: string) {
  return useQuery({
    queryKey: membersQueryKey(organizationId),
    queryFn: () =>
      apiGet<OrganizationMember[]>(
        `organizations/${organizationId}/members`,
      ),
    enabled: Boolean(organizationId),
  });
}

/** Invite a new member to the organization. */
export function useInviteMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InviteMemberInput) =>
      apiPost(
        `organizations/${organizationId}/members`,
        input,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: membersQueryKey(organizationId),
      }),
  });
}

/** Update an existing member's roles or membership status. */
export function useUpdateMember(
  organizationId: string,
  membershipId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMembershipInput) =>
      apiPatch(
        `organizations/${organizationId}/members/${membershipId}`,
        input,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: membersQueryKey(organizationId),
      }),
  });
}
