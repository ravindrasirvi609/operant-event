'use client';

import { use, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { RoleEditor } from '@/components/organizations/role-editor';
import { useCreateRole, useRoles } from '@/hooks/use-roles';
import type { PermissionKey } from '@/lib/api/permissions';

export default function OrganizationRolesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const rolesQuery = useRoles(orgId);
  const createRole = useCreateRole(orgId);
  const [showEditor, setShowEditor] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(values: { name: string; description?: string; permissions: PermissionKey[] }) {
    setCreateError(null);
    try {
      await createRole.mutateAsync(values);
      setShowEditor(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create role.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Roles</h1>
        {!showEditor ? <Button onClick={() => setShowEditor(true)}>New role</Button> : null}
      </div>

      <AsyncBoundary query={rolesQuery} empty={<p className="text-sm text-muted-foreground">No custom roles yet.</p>}>
        {(roles) => (
          <ul className="divide-y rounded-lg border">
            {roles.map((role) => (
              <li key={role.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{role.name}</p>
                  {role.description ? <p className="text-xs text-muted-foreground">{role.description}</p> : null}
                </div>
                {role.isSystem ? <Badge variant="secondary">System role</Badge> : <Badge variant="outline">Custom</Badge>}
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>

      {showEditor ? (
        <div className="space-y-3 border-t pt-4">
          <RoleEditor onSubmit={handleCreate} />
          {createError ? (
            <p role="alert" className="text-sm text-destructive">
              {createError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
