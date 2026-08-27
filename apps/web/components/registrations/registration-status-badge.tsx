import { Badge } from '@/components/ui/badge';
import type { RegistrationStatus } from '@/lib/registrations/types';

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  PENDING: 'Pending payment',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  CHECKED_IN: 'Checked in',
};

const STATUS_VARIANTS: Record<RegistrationStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  CANCELLED: 'destructive',
  REFUNDED: 'outline',
  CHECKED_IN: 'default',
};

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
