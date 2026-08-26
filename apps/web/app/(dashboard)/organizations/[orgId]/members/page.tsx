'use client';

import { use } from 'react';
import { MembersInvitePanel } from '@/components/organizations/members-invite-panel';

export default function OrganizationMembersPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Members</h1>
      <MembersInvitePanel organizationId={orgId} />
    </div>
  );
}
