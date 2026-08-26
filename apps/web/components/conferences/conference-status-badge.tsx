import { Badge } from '@/components/ui/badge';
import type { ConferenceStatus } from '@/lib/conferences/types';

const STATUS_LABELS: Record<ConferenceStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open for submissions',
  REVIEW: 'Under review',
  REGISTRATION: 'Registration open',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const STATUS_VARIANTS: Record<ConferenceStatus, 'outline' | 'default' | 'secondary'> = {
  DRAFT: 'outline',
  OPEN: 'default',
  REVIEW: 'secondary',
  REGISTRATION: 'default',
  ONGOING: 'default',
  COMPLETED: 'secondary',
  ARCHIVED: 'outline',
};

export function ConferenceStatusBadge({ status }: { status: ConferenceStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
