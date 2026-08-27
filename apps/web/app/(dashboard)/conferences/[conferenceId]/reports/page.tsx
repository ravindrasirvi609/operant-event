'use client';

import { use } from 'react';
import { DashboardTabs } from '@/components/reports/dashboard-tabs';

export default function ReportsPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Reports</h2>
      <DashboardTabs conferenceId={conferenceId} />
    </div>
  );
}
