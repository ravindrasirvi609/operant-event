import { Badge } from '@/components/ui/badge';
import type { CertificateStatus } from '@/lib/certificates/types';

const VARIANTS: Record<CertificateStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  ELIGIBLE: 'secondary',
  GENERATED: 'outline',
  ISSUED: 'default',
  REVOKED: 'destructive',
};

export function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  return <Badge variant={VARIANTS[status]}>{status}</Badge>;
}
