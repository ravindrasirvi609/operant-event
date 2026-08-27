'use client';

import { use } from 'react';
import { PublicProgramView } from '@/components/program/public-program-view';

export default function PublicProgramPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return <PublicProgramView conferenceId={conferenceId} />;
}
