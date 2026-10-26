
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import type { SponsorTier } from '@/lib/sponsors/types';

export interface PublicSponsor {
  id: string;
  name: string;
  tier: SponsorTier;
  website: string | null;
  logoFileId: string | null;
}

export function usePublicSponsors(conferenceId: string) {
  return useQuery({
    queryKey: ['conferences', conferenceId, 'public-sponsors'],
    queryFn: () =>
      apiGet<PublicSponsor[]>(
        `conferences/${encodeURIComponent(conferenceId)}/public-sponsors`,
      ),
    enabled: Boolean(conferenceId),
  });
}
