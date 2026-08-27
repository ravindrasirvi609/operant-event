import { Badge } from '@/components/ui/badge';
import type { SessionStatus } from '@/lib/program/types';

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return <Badge variant={status === 'PUBLISHED' ? 'default' : 'outline'}>{status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge>;
}
