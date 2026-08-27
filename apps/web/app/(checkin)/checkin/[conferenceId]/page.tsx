'use client';

import { use } from 'react';
import { CheckinScanner } from '@/components/checkin/checkin-scanner';
import { useCheckIn } from '@/hooks/use-checkins';

export default function CheckinScannerPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  const checkIn = useCheckIn();
  return <CheckinScanner conferenceId={conferenceId} onCheckIn={(input) => checkIn.mutateAsync(input)} />;
}
