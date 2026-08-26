'use client';

import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api/client';

export interface InviteMemberInput {
  email: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
}

/**
 * Invite-only: there is no `GET organizations/:id/members` endpoint, so a
 * member list/roster page cannot be built against real data yet — see
 * docs/plans/frontend/01-auth-organization-rbac-conference.md's
 * Definition of Done note. `<MembersInvitePanel>` discloses this gap
 * directly in the UI rather than showing a fake or empty list.
 */
export function useInviteMember(organizationId: string) {
  return useMutation({
    mutationFn: (input: InviteMemberInput) => apiPost(`organizations/${organizationId}/members`, input),
  });
}
