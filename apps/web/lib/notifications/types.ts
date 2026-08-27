export interface EmailTemplate {
  id: string;
  organizationId: string;
  /** `null` = organization-wide default; a non-null value overrides it for that one conference, same `event` key. */
  conferenceId: string | null;
  event: string;
  subject: string;
  body: string;
}

/**
 * `data` still carries whatever template variables were interpolated
 * into the notification's email (arbitrary strings, not a navigation
 * contract). `entityType`/`entityId` are the structured reference —
 * see `lib/notifications/entity-route.ts` for the entityType -> route
 * mapping. Both are `null` for any notification emitted before this
 * field existed, or for an event type the mapping doesn't cover yet;
 * `notification-list.tsx` falls back to mark-read-only in that case.
 */
export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}
