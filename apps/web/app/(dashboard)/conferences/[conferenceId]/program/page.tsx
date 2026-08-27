'use client';

import { use } from 'react';
import { SessionList } from '@/components/program/session-list';

export default function ProgramPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Program</h2>
      <SessionList conferenceId={conferenceId} />
    </div>
  );
}
