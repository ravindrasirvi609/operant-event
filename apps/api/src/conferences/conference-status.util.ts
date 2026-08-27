import type { ConferenceStatus } from '@operant-event/database';

const ALLOWED_TRANSITIONS: Record<ConferenceStatus, ConferenceStatus[]> = {
  DRAFT: ['OPEN', 'ARCHIVED'],
  OPEN: ['REVIEW'],
  REVIEW: ['REGISTRATION'],
  REGISTRATION: ['ONGOING'],
  ONGOING: ['COMPLETED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function isValidConferenceStatusTransition(
  from: ConferenceStatus,
  to: ConferenceStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
