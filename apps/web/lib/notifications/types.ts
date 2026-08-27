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
 * `type`/`data` carry whatever the triggering event happened to pass —
 * there is no `entityId`/`entityType`/`url` field on this model, so a
 * reliable "click this notification -> navigate to the relevant page"
 * feature is NOT supported by the backend today. `data`'s keys are
 * whatever template variables were interpolated (arbitrary strings),
 * not structured entity references.
 */
export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
