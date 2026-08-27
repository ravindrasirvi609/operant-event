'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useMarkNotificationRead, useNotifications } from '@/hooks/use-notifications';
import { notificationEntityRoute } from '@/lib/notifications/entity-route';
import type { Notification } from '@/lib/notifications/types';

export function NotificationList() {
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <AsyncBoundary
        query={notificationsQuery}
        empty={<p className="text-sm text-muted-foreground">No notifications yet.</p>}
      >
        {(notifications) => (
          <ul className="divide-y rounded-lg border">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkRead={() => markRead.mutate(notification.id)}
              />
            ))}
          </ul>
        )}
      </AsyncBoundary>
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
