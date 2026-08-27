'use client';

import { use } from 'react';
import { ExportRequestForm } from '@/components/jobs/export-request-form';

export default function ExportsPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Exports</h2>
      <ExportRequestForm conferenceId={conferenceId} />
    </div>
  );
}
