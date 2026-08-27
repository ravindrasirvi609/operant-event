/** §20 trigger table — one event name per row, shared across every emitting module. */
export const NOTIFICATION_EVENTS = {
  ABSTRACT_SUBMITTED: 'abstract.submitted',
  REVIEW_ASSIGNED: 'review.assigned',
  REVIEW_DUE: 'review.due',
  ABSTRACT_REVISION_REQUIRED: 'abstract.revision_required',
  ABSTRACT_ACCEPTED: 'abstract.accepted',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  CERTIFICATE_ISSUED: 'certificate.issued',
  CONFERENCE_REMINDER: 'conference.reminder',
} as const;

export type NotificationEventName =
  (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS];

export interface NotificationEventPayload {
  organizationId: string;
  conferenceId: string;
  userId: string;
  /** Rendered against the resolved EmailTemplate.body/subject as {{key}}. */
  templateData: Record<string, string>;
  /** Structured reference to the entity this event concerns, e.g. 'certificate' + the certificate id. */
  entityType?: string;
  entityId?: string;
}
