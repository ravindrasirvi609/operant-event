'use client';

import Link from 'next/link';
import { use } from 'react';
import { Button } from '@/components/ui/button';
import { CheckinDashboard } from '@/components/checkin/checkin-dashboard';

export default function CheckinsPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Check-ins</h2>
        <Button render={<Link href={`/checkin/${conferenceId}`} />}>Open scanner</Button>
      </div>
      <CheckinDashboard conferenceId={conferenceId} />
    </div>
  );
}
