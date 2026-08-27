'use client';

import { use } from 'react';
import { SessionDetail } from '@/components/program/session-detail';

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ conferenceId: string; sessionId: string }>;
}) {
  const { conferenceId, sessionId } = use(params);
  return <SessionDetail conferenceId={conferenceId} sessionId={sessionId} />;
}
