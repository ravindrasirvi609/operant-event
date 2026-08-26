export const CONFERENCE_STATUSES = [
  'DRAFT',
  'OPEN',
  'REVIEW',
  'REGISTRATION',
  'ONGOING',
  'COMPLETED',
  'ARCHIVED',
] as const;
export type ConferenceStatus = (typeof CONFERENCE_STATUSES)[number];

export interface Conference {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  shortName: string | null;
  description: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  contactEmail: string | null;
  status: ConferenceStatus;
}

export const REVIEW_MODES = ['SINGLE_BLIND', 'DOUBLE_BLIND', 'OPEN'] as const;
export type ReviewMode = (typeof REVIEW_MODES)[number];

export interface ConferenceSetting {
  conferenceId: string;
  abstractEnabled: boolean;
  abstractStartDate: string | null;
  abstractEndDate: string | null;
  reviewEnabled: boolean;
  reviewMode: ReviewMode;
  registrationEnabled: boolean;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  paymentEnabled: boolean;
  certificateEnabled: boolean;
  checkinEnabled: boolean;
}

export interface ConferenceTrack {
  id: string;
  conferenceId: string;
  name: string;
  code: string | null;
  description: string | null;
  sortOrder: number;
  status: string;
}
