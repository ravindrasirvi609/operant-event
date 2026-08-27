import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/registrations/types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  PARTIALLY_REFUNDED: 'Partially refunded',
  REFUNDED: 'Refunded',
};

const STATUS_VARIANTS: Record<OrderStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  PAID: 'default',
  FAILED: 'destructive',
  CANCELLED: 'destructive',
  PARTIALLY_REFUNDED: 'outline',
  REFUNDED: 'outline',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
