export const REVIEW_ASSIGNMENT_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'DECLINED',
  'OVERDUE',
  'CANCELLED',
] as const;
export type ReviewAssignmentStatus = (typeof REVIEW_ASSIGNMENT_STATUSES)[number];

export const REVIEW_RECOMMENDATIONS = ['ACCEPT', 'REJECT', 'MINOR_REVISION', 'MAJOR_REVISION'] as const;
export type ReviewRecommendation = (typeof REVIEW_RECOMMENDATIONS)[number];

export const DECISION_TYPES = ['ACCEPTED', 'REJECTED', 'REVISION_REQUIRED', 'WAITLISTED'] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

export interface Reviewer {
  id: string;
  organizationId: string;
  userId: string;
  status: string;
  profile: ReviewerProfile | null;
}

export interface ReviewerProfile {
  institution: string | null;
  designation: string | null;
  bio: string | null;
  expertise: string[];
  keywords: string[];
}

export interface Review {
  id: string;
  assignmentId: string;
  overallScore: number;
  originalityScore: number;
  methodologyScore: number;
  significanceScore: number;
  presentationScore: number;
  commentsToAuthor: string | null;
  privateComments: string | null;
  recommendation: ReviewRecommendation;
  submittedAt: string;
}

/**
 * Mirrors ReviewerAbstractProjection exactly — `submittedBy` is present
 * ONLY when the conference's reviewMode is 'OPEN'; in every other case
 * (including no settings row at all) the key is genuinely absent from
 * the response, not null.
 */
export interface ReviewerAbstractProjection {
  id: string;
  title: string;
  submissionType: string;
  status: string;
  submittedBy?: string;
}

export interface ReviewAssignmentProjection {
  id: string;
  status: ReviewAssignmentStatus;
  dueDate: string | null;
  assignedAt: string;
  abstract: ReviewerAbstractProjection;
  review: Review | null;
}

export interface DashboardCounts {
  assigned: number;
  completed: number;
  overdue: number;
}
