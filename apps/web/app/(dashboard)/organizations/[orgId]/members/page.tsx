'use client';

import { use } from 'react';
import { MembersInvitePanel } from '@/components/organizations/members-invite-panel';
import { MembersList } from '@/components/organizations/members-list';

export default function OrganizationMembersPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Members</h1>
      <MembersList organizationId={orgId} />
      <MembersInvitePanel organizationId={orgId} />
    </div>
  );
}
