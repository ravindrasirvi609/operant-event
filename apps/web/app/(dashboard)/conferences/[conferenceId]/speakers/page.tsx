'use client';

import { use } from 'react';
import { SpeakerRoster } from '@/components/program/speaker-roster';

export default function SpeakersPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Speakers</h2>
      <SpeakerRoster conferenceId={conferenceId} />
    </div>
  );
}
