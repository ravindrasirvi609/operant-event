'use client';

import { use } from 'react';
import { AbstractWizard } from '@/components/abstracts/abstract-wizard';

export default function NewAbstractPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Submit an abstract</h1>
      <AbstractWizard conferenceId={conferenceId} />
    </div>
  );
}
