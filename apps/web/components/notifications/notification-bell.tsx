'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell } from 'lucide-react';

/**
 * Unread count is derived from `readAt === null` — never a
 * separately-fetched count, so it can never drift from what
 * `GET notifications/my` itself would show.
 */
export function NotificationBell() {
  const notificationsQuery = useNotifications();
  const unreadCount = (notificationsQuery.data ?? []).filter((n) => n.readAt === null).length;

  return (
    <Button variant="ghost" size="sm" render={<Link href="/notifications" />} className="relative">
      <Bell className="size-4" /> Notifications
      {unreadCount > 0 ? (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs text-destructive-foreground">
          {unreadCount}
        </span>
      ) : null}
    </Button>
  );
}
