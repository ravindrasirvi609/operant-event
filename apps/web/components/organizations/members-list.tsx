
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useMembers, useUpdateMember } from '@/hooks/use-members';
import { useRoles } from '@/hooks/use-roles';
import type { OrganizationMember } from '@/lib/organizations/types';

function MemberRow({
  member,
  organizationId,
  availableRoles,
  currentUserId,
}: {
  member: OrganizationMember;
  organizationId: string;
  availableRoles: { id: string; name: string }[];
  currentUserId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState(
    member.roles.map((item) => item.role.id),
  );
  const [error, setError] = useState<string | null>(null);

  const updateMember = useUpdateMember(organizationId, member.id);

  async function saveRoles() {
    setError(null);

    try {
      await updateMember.mutateAsync({ roleIds: selectedRoleIds });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update roles.');
    }
  }

  async function toggleStatus() {
    setError(null);

    try {
      await updateMember.mutateAsync({
        status: member.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update member status.');
    }
  }

  const isSelf = currentUserId === member.userId;
  const isActive = member.status === 'ACTIVE';

  return (
    <tr className="border-t align-top">
      <td className="py-3 pr-3">
        {member.user.firstName} {member.user.lastName}
        {isSelf ? (
          <span className="ml-2 text-xs text-muted-foreground">(You)</span>
        ) : null}
      </td>

      <td className="py-3 pr-3">{member.user.email}</td>

      <td className="py-3 pr-3">
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {member.status}
        </Badge>
      </td>

      <td className="py-3 pr-3">
        {editing ? (
          <div className="min-w-44 space-y-2">
            {availableRoles.map((role) => (
              <label key={role.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={(event) => {
                    setSelectedRoleIds((previous) =>
                      event.target.checked
                        ? [...previous, role.id]
                        : previous.filter((id) => id !== role.id),
                    );
                  }}
                />
                <span>{role.name}</span>
              </label>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                disabled={updateMember.isPending || selectedRoleIds.length === 0}
                onClick={saveRoles}
              >
                Save roles
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={updateMember.isPending}
                onClick={() => {
                  setSelectedRoleIds(member.roles.map((item) => item.role.id));
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p>{member.roles.map((item) => item.role.name).join(', ') || '—'}</p>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedRoleIds(member.roles.map((item) => item.role.id));
                setEditing(true);
                setError(null);
              }}
            >
              Edit roles
            </Button>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </td>

      <td className="py-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSelf || updateMember.isPending}
          title={isSelf ? 'You cannot deactivate your own membership here.' : undefined}
          onClick={toggleStatus}
        >
          {updateMember.isPending
            ? 'Saving…'
            : isActive
              ? 'Deactivate'
              : 'Reactivate'}
        </Button>
      </td>
    </tr>
  );
}

export function MembersList({
  organizationId,
}: {
  organizationId: string;
}) {
  const membersQuery = useMembers(organizationId);
  const rolesQuery = useRoles(organizationId);

  // The member list endpoint does not provide the signed-in user's ID.
  // We therefore do not guess it or allow client-side identity assumptions.
  const currentUserId = undefined;

  return (
    <AsyncBoundary
      query={membersQuery}
      empty={<p className="text-sm text-muted-foreground">No members yet.</p>}
    >
      {(members) => (
        <AsyncBoundary
          query={rolesQuery}
          empty={<p className="text-sm text-muted-foreground">No roles exist yet.</p>}
        >
          {(roles) => (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Roles</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {members.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      organizationId={organizationId}
                      availableRoles={roles}
                      currentUserId={currentUserId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      )}
    </AsyncBoundary>
  );
}
