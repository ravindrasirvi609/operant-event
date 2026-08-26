'use client';

import { use } from 'react';
import { TrackList } from '@/components/conferences/track-list';

export default function ConferenceTracksPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);

  return <TrackList conferenceId={conferenceId} />;
}
