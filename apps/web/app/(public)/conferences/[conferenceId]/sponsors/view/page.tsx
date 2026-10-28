'use client';

import { use } from 'react';
import { PublicSponsorsView } from '@/components/sponsors/public-sponsors-view';

export default function PublicSponsorsPage({
  params,
}: {
  params: Promise<{ conferenceId: string }>;
}) {
  const { conferenceId } = use(params);

  return <PublicSponsorsView conferenceId={conferenceId} />;
}