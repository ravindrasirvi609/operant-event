import { Badge } from '@/components/ui/badge';
import type { SponsorPaymentStatus } from '@/lib/sponsors/types';

const VARIANTS: Record<SponsorPaymentStatus, 'outline' | 'secondary' | 'default'> = {
  PENDING: 'outline',
  INVOICED: 'secondary',
  PAID: 'default',
};

/** Shared by sponsors and exhibitors — both have the identical PENDING/INVOICED/PAID lifecycle. */
export function PaymentStatusBadge({ status }: { status: SponsorPaymentStatus }) {
  return <Badge variant={VARIANTS[status]}>{status}</Badge>;
}
