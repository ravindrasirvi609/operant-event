'use client';

import { Badge } from '@/components/ui/badge';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useMembers } from '@/hooks/use-members';

export function MembersList({ organizationId }: { organizationId: string }) {
  const membersQuery = useMembers(organizationId);

  return (
    <AsyncBoundary
      query={membersQuery}
      empty={<p className="text-sm text-muted-foreground">No members yet.</p>}
    >
      {(members) => (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Name</th>
              <th className="py-1">Email</th>
              <th className="py-1">Status</th>
              <th className="py-1">Roles</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t">
                <td className="py-2">
                  {member.user.firstName} {member.user.lastName}
                </td>
                <td className="py-2">{member.user.email}</td>
                <td className="py-2">
                  <Badge variant={member.status === 'ACTIVE' ? 'default' : 'secondary'}>{member.status}</Badge>
                </td>
                <td className="py-2">{member.roles.map((r) => r.role.name).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AsyncBoundary>
  );
}
