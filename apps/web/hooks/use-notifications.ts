'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api/client';
import type { Notification } from '@/lib/notifications/types';

const NOTIFICATIONS_QUERY_KEY = ['notifications', 'my'];
const POLL_INTERVAL_MS = 30000;

/**
 * A global concern, not per-page — call this once from `<AppShell>`
 * (Phase 0/1's persistent dashboard header), never re-invoked per page,
 * so there is only ever one 30s poll running regardless of navigation.
 */
export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => apiGet<Notification[]>('notifications/my'),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

/** Idempotent on the backend — marking an already-read notification read again is a harmless no-op, not an error. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => apiPatch<Notification>(`notifications/${notificationId}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
