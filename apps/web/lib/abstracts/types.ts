export const ABSTRACT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'SCREENING',
  'UNDER_REVIEW',
  'REVISION_REQUIRED',
  'RESUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'WAITLISTED',
  'SCHEDULED',
  'PRESENTED',
  'WITHDRAWN',
] as const;
export type AbstractStatus = (typeof ABSTRACT_STATUSES)[number];

export const SUBMISSION_TYPES = ['ORAL', 'POSTER', 'E_POSTER', 'WORKSHOP', 'SYMPOSIUM'] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

/** Mirrors apps/api/src/abstracts/abstracts.service.ts's EDITABLE_STATUSES/WITHDRAWABLE_STATUSES exactly. */
export const EDITABLE_STATUSES: readonly AbstractStatus[] = ['DRAFT', 'REVISION_REQUIRED'];
export const WITHDRAWABLE_STATUSES: readonly AbstractStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'SCREENING',
  'UNDER_REVIEW',
  'REVISION_REQUIRED',
];

export interface Abstract {
  id: string;
  conferenceId: string;
  trackId: string | null;
  submissionNumber: string | null;
  title: string;
  submissionType: SubmissionType;
  presentationPreference: string | null;
  status: AbstractStatus;
  submittedBy: string;
  currentVersionId: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AbstractVersion {
  id: string;
  abstractId: string;
  versionNumber: number;
  formData: Record<string, unknown>;
  submittedAt: string;
  submittedBy: string;
}

export interface AuthorInput {
  firstName: string;
  lastName: string;
  email?: string;
  mobile?: string;
  designation?: string;
  institution?: string;
  department?: string;
  city?: string;
  country?: string;
  isCorresponding?: boolean;
  isPresenting?: boolean;
}
