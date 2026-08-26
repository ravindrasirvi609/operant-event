'use client';

import { use } from 'react';
import { OrganizerAbstractsTable } from '@/components/abstracts/organizer-abstracts-table';

export default function ConferenceAbstractsPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);

  return <OrganizerAbstractsTable conferenceId={conferenceId} />;
}
