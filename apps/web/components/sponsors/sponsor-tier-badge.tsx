import { Badge } from '@/components/ui/badge';
import type { SponsorTier } from '@/lib/sponsors/types';

const VARIANTS: Record<SponsorTier, 'default' | 'secondary' | 'outline'> = {
  PLATINUM: 'default',
  GOLD: 'default',
  SILVER: 'secondary',
  BRONZE: 'outline',
};

export function SponsorTierBadge({ tier }: { tier: SponsorTier }) {
  return <Badge variant={VARIANTS[tier]}>{tier}</Badge>;
}
