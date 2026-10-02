'use client';

import { Building2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAllOrganizations, useUpdateOrganizationStatus } from '@/hooks/use-organizations';
import type { OrganizationWithMemberCount } from '@/lib/organizations/types';

function StatusBadge({ status }: { status: OrganizationWithMemberCount['status'] }) {
  if (status === 'ACTIVE') return <Badge>Active</Badge>;
  if (status === 'SUSPENDED') return <Badge variant="destructive">Suspended</Badge>;
  return <Badge variant="secondary">Archived</Badge>;
}

function OrganizationsTable({ organizations }: { organizations: OrganizationWithMemberCount[] }) {
  const updateStatus = useUpdateOrganizationStatus();
  const [suspendTarget, setSuspendTarget] = useState<OrganizationWithMemberCount | null>(null);

  function activate(organizationId: string) {
    updateStatus.mutate({ organizationId, status: 'ACTIVE' });
  }

  function confirmSuspend() {
    if (!suspendTarget) return;
    updateStatus.mutate(
      { organizationId: suspendTarget.id, status: 'SUSPENDED' },
      { onSuccess: () => setSuspendTarget(null) },
    );
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1">Organization</th>
            <th className="py-1">Slug</th>
            <th className="py-1">Status</th>
            <th className="py-1">Members</th>
            <th className="py-1">Contact</th>
            <th className="py-1 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {organizations.map((org) => (
            <tr key={org.id} className="border-t">
              <td className="py-2 font-medium">{org.name}</td>
              <td className="py-2 font-mono text-xs text-muted-foreground">{org.slug}</td>
              <td className="py-2">
                <StatusBadge status={org.status} />
              </td>
              <td className="py-2">{org._count.memberships}</td>
              <td className="py-2 text-muted-foreground">{org.contactEmail ?? '—'}</td>
              <td className="py-2 text-right">
                {org.status === 'ACTIVE' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateStatus.isPending}
                    onClick={() => setSuspendTarget(org)}
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateStatus.isPending}
                    onClick={() => activate(org.id)}
                  >
                    Activate
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={suspendTarget !== null}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        title={`Suspend ${suspendTarget?.name ?? 'this organization'}?`}
        description="Every member loses access to this organization's conferences, registrations, and data immediately. You can reactivate it at any time."
        confirmLabel="Suspend organization"
        onConfirm={confirmSuspend}
        isConfirming={updateStatus.isPending}
      />
    </>
  );
}

export default function AllOrganizationsPage() {
  const router = useRouter();
  const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentUser();
  const organizationsQuery = useAllOrganizations();

  // This page is platform-admin only — redirect anyone who isn't a Super Admin.
  useEffect(() => {
    if (!isCurrentUserLoading && currentUser && !currentUser.isSuperAdmin) {
      router.replace('/');
    }
  }, [currentUser, isCurrentUserLoading, router]);

  if (isCurrentUserLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Checking access…" />
      </div>
    );
  }

  // Redirect is underway — render nothing so the table doesn't flash during navigation.
  if (!currentUser?.isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">All organizations</h1>
          <p className="text-sm text-muted-foreground">
            Every organization on the platform. Suspending one blocks all of its members immediately.
          </p>
        </div>
        <Button render={<Link href="/organizations/new" />}>
          <Building2 className="size-4" /> Create an organization
        </Button>
      </div>

      <AsyncBoundary
        query={organizationsQuery}
        empty={<p className="text-sm text-muted-foreground">No organizations have been created yet.</p>}
      >
        {(organizations) => <OrganizationsTable organizations={organizations} />}
      </AsyncBoundary>
    </div>
  );
}
