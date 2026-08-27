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

export const PAYMENT_MODES = ['GATEWAY', 'MANUAL'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

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
  /**
   * Read-only here: `UpdateConferenceSettingsDto` has no `paymentMode`
   * field, so there is no UI path to change it — only to display it.
   * `OrdersService.create`'s response shape is still the sole source of
   * truth for which branch actually ran; never use this field to decide
   * that.
   */
  paymentMode: PaymentMode;
  manualPaymentInstructions: string | null;
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
