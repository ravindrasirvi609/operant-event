'use client';

import { use } from 'react';
import { SponsorForm } from '@/components/sponsors/sponsor-form';
import { SponsorTable } from '@/components/sponsors/sponsor-table';

export default function SponsorsPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-lg font-semibold">Sponsors</h2>
      <SponsorTable conferenceId={conferenceId} />
      <SponsorForm conferenceId={conferenceId} />
    </div>
  );
}
