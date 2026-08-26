import { Badge } from '@/components/ui/badge';
import type { AbstractStatus } from '@/lib/abstracts/types';

const STATUS_LABELS: Record<AbstractStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  SCREENING: 'Screening',
  UNDER_REVIEW: 'Under review',
  REVISION_REQUIRED: 'Revision required',
  RESUBMITTED: 'Resubmitted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WAITLISTED: 'Waitlisted',
  SCHEDULED: 'Scheduled',
  PRESENTED: 'Presented',
  WITHDRAWN: 'Withdrawn',
};

const STATUS_VARIANTS: Record<AbstractStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  DRAFT: 'outline',
  SUBMITTED: 'default',
  SCREENING: 'secondary',
  UNDER_REVIEW: 'secondary',
  REVISION_REQUIRED: 'destructive',
  RESUBMITTED: 'default',
  ACCEPTED: 'default',
  REJECTED: 'destructive',
  WAITLISTED: 'secondary',
  SCHEDULED: 'default',
  PRESENTED: 'default',
  WITHDRAWN: 'outline',
};

export function AbstractStatusBadge({ status }: { status: AbstractStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
