const ENTITY_ROUTES: Record<string, (entityId: string) => string> = {
  abstract: (id) => `/my-abstracts/${id}`,
  reviewAssignment: (id) => `/my-reviews/${id}`,
  order: (id) => `/orders/${id}`,
  certificate: (id) => `/certificates/${id}`,
  conference: (id) => `/conferences/${id}/program/view`,
};

/**
 * Maps a notification's `entityType`/`entityId` to the page a click
 * should navigate to. Returns null for a notification with no
 * structured entity reference (emitted before this field existed) or
 * for an entityType this mapping doesn't cover yet — callers must fall
 * back to mark-read-only in that case, not guess at a route.
 */
export function notificationEntityRoute(notification: {
  entityType: string | null;
  entityId: string | null;
}): string | null {
  if (!notification.entityType || !notification.entityId) {
    return null;
  }
  const buildRoute = ENTITY_ROUTES[notification.entityType];
  return buildRoute ? buildRoute(notification.entityId) : null;
}
