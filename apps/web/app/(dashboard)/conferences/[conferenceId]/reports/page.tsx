
'use client';

import { use } from 'react';
import { BarChart3, FileText } from 'lucide-react';
import { DashboardTabs } from '@/components/reports/dashboard-tabs';

export default function ReportsPage({
  params,
}: {
  params: Promise<{ conferenceId: string }>;
}) {
  const { conferenceId } = use(params);

  return (
    <main className="w-full min-w-0 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Reports & Analytics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor conference registrations, revenue, reviews, attendance
              and certificates from one place.
            </p>
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
          <FileText className="size-4" />
          Conference summary
        </div>
      </header>

      <section className="min-w-0 rounded-xl border bg-card p-3 shadow-sm sm:p-5">
        <DashboardTabs conferenceId={conferenceId} />
      </section>
    </main>
  );
}
