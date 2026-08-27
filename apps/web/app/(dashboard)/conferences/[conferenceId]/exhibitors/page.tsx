'use client';

import { use } from 'react';
import { ExhibitorForm } from '@/components/exhibitors/exhibitor-form';
import { ExhibitorTable } from '@/components/exhibitors/exhibitor-table';

export default function ExhibitorsPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-lg font-semibold">Exhibitors</h2>
      <ExhibitorTable conferenceId={conferenceId} />
      <ExhibitorForm conferenceId={conferenceId} />
    </div>
  );
}
