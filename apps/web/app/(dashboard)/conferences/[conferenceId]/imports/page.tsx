'use client';

import { use } from 'react';
import { ImportRequestForm } from '@/components/jobs/import-request-form';

export default function ImportsPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Imports</h2>
      <ImportRequestForm conferenceId={conferenceId} />
    </div>
  );
}
