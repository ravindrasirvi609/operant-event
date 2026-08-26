'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import type { OrganizationSummary } from '@/lib/auth/types';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'me'],
    queryFn: () => apiGet<OrganizationSummary[]>('organizations/me'),
  });
}
