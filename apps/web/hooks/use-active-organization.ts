'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useActiveOrgStore } from '@/lib/org/active-org.store';

/**
 * One source of truth for "which organization is active" — every
 * org-scoped page reads from here, never re-derives it locally.
 */
export function useActiveOrganization() {
  const activeOrgId = useActiveOrgStore((state) => state.activeOrgId);
  const hydrateFromCookie = useActiveOrgStore((state) => state.hydrateFromCookie);
  const setActiveOrgIdInStore = useActiveOrgStore((state) => state.setActiveOrgId);
  const queryClient = useQueryClient();

  useEffect(() => {
    hydrateFromCookie();
  }, [hydrateFromCookie]);

  function setActiveOrganization(organizationId: string): void {
    setActiveOrgIdInStore(organizationId);
    // Switching organizations changes what every org-scoped query means —
    // refetch everything under the new x-organization-id header.
    void queryClient.invalidateQueries();
  }

  return { activeOrgId, setActiveOrganization };
}
