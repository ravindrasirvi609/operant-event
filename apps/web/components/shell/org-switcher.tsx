'use client';

import { useActiveOrganization } from '@/hooks/use-active-organization';
import { useOrganizations } from '@/hooks/use-organizations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function OrgSwitcher() {
  const { data: organizations, isPending } = useOrganizations();
  const { activeOrgId, setActiveOrganization } = useActiveOrganization();

  if (isPending || !organizations || organizations.length === 0) {
    return null;
  }

  const activeOrganization = organizations.find((organization) => organization.id === activeOrgId);

  return (
    <Select
      value={activeOrgId ?? undefined}
      onValueChange={(value) => {
        if (value) {
          setActiveOrganization(value);
        }
      }}
    >
      <SelectTrigger aria-label="Active organization" className="w-48">
        <SelectValue placeholder="Select organization">{activeOrganization?.name}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {organizations.map((organization) => (
          <SelectItem key={organization.id} value={organization.id}>
            {organization.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
