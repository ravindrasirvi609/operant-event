'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useClearNotifications, useMarkNotificationRead, useNotifications } from '@/hooks/use-notifications';
import { notificationEntityRoute } from '@/lib/notifications/entity-route';
import type { Notification } from '@/lib/notifications/types';

export function NotificationList() {
  const clearNotifications = useClearNotifications();
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <div className="flex items-center justify-between gap-3">
  <h1 className="text-xl font-semibold">Notifications</h1>

  <Button
    size="sm"
    variant="outline"
    disabled={
      !notificationsQuery.data?.length ||
      clearNotifications.isPending
    }
    onClick={() => {
      if (window.confirm('Clear all notifications from this list?')) {
        clearNotifications.mutate();
      }
    }}
  >
    {clearNotifications.isPending ? 'Clearing...' : 'Clear All'}
  </Button>
</div>
  );
}

function NotificationRow({ notification, onMarkRead }: { notification: Notification; onMarkRead: () => void }) {
  const route = notificationEntityRoute(notification);
  const body = (
    <div>
      <p className="text-sm font-medium">{notification.title}</p>
      <p className="text-sm text-muted-foreground">{notification.message}</p>
      <p className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</p>
    </div>
  );

  return (
    <li className={`p-3 ${notification.readAt === null ? 'bg-primary/5' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        {route ? (
          <Link href={route} className="flex-1" onClick={() => notification.readAt === null && onMarkRead()}>
            {body}
          </Link>
        ) : (
          body
        )}
        {notification.readAt === null ? (
          <Button size="sm" variant="outline" onClick={onMarkRead}>
            Mark read
          </Button>
        ) : null}
      </div>
    </li>
  );
}
