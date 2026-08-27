'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import type { DashboardKey } from '@/lib/reports/types';

/**
 * Generic across all 7 dashboards — the exact `dashboard` key string
 * must be one of `DASHBOARDS`'s values (kebab-case), never guessed;
 * an unknown key 404s (`NotFoundException`), not 400.
 */
export function useDashboard<T>(conferenceId: string, dashboard: DashboardKey) {
  return useQuery({
    queryKey: ['conferences', conferenceId, 'reports', dashboard],
    queryFn: () => apiGet<T>(`conferences/${conferenceId}/reports/${dashboard}`),
    enabled: Boolean(conferenceId),
  });
}
