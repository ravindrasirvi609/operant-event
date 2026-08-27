'use client';

import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useMarkNotificationRead, useNotifications } from '@/hooks/use-notifications';

/**
 * There is no `entityId`/`entityType`/`url` on the Notification model —
 * `data` only ever carries whatever template variables were
 * interpolated into the email, not a structured reference — so clicking
 * a notification here only marks it read; it does not navigate
 * anywhere. Building a "jump to the relevant page" feature would mean
 * guessing at `data`'s shape per `type`, which the backend gives no
 * contract for.
 */
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
              <li key={notification.id} className={`p-3 ${notification.readAt === null ? 'bg-primary/5' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                  {notification.readAt === null ? (
                    <Button size="sm" variant="outline" onClick={() => markRead.mutate(notification.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}
