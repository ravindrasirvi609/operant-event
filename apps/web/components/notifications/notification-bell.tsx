
'use client';

import Link from 'next/link';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const notificationsQuery = useNotifications();

  const unreadCount = (notificationsQuery.data ?? []).filter(
    (notification) => notification.readAt === null,
  ).length;

  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-7 shrink-0 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      }
    >
      <Bell className="size-4" aria-hidden="true" />
      <span>Notifications</span>

      {unreadCount > 0 && (
        <span
          className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs text-destructive-foreground"
          aria-label={`${unreadCount} unread notifications`}
        >
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
