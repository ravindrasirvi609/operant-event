import { apiGet } from '@/lib/api/server-client';
import type { OrganizationSummary } from '@/lib/auth/types';

export default async function DashboardHomePage() {
  const organizations = await apiGet<OrganizationSummary[]>('organizations/me');

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Conferences</h1>
      <p className="text-sm text-muted-foreground">
        {organizations.length === 0
          ? 'You are not a member of any organization yet.'
          : `You belong to ${organizations.length} organization${organizations.length === 1 ? '' : 's'}.`}
      </p>
    </div>
  );
}
