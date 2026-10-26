
'use client';

import { use } from 'react';
import { ExhibitorForm } from '@/components/exhibitors/exhibitor-form';
import { ExhibitorTable } from '@/components/exhibitors/exhibitor-table';

export default function ExhibitorsPage({
  params,
}: {
  params: Promise<{ conferenceId: string }>;
}) {
  const { conferenceId } = use(params);

  return (
    <main className="w-full min-w-0 max-w-none space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Exhibitors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage exhibition companies, booth assignments, payments and staff.
          </p>
        </div>
      </header>

      <section className="w-full min-w-0">
        <ExhibitorTable conferenceId={conferenceId} />
      </section>

      <section className="w-full min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <ExhibitorForm conferenceId={conferenceId} />
      </section>
    </main>
  );
}
