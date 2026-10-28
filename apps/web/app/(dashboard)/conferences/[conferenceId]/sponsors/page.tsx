
'use client';

import { use } from 'react';
import Link from 'next/link';
import { SponsorForm } from '@/components/sponsors/sponsor-form';
import { SponsorTable } from '@/components/sponsors/sponsor-table';

export default function SponsorsPage({
  params,
}: {
  params: Promise<{ conferenceId: string }>;
}) {
  const { conferenceId } = use(params);

  return (
    <main className="w-full min-w-0 max-w-none space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Sponsors</h2>

        <Link
          href={`/conferences/${encodeURIComponent(conferenceId)}/sponsors/view`}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100"
        >
          View Public Sponsors
          <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <section className="w-full min-w-0">
        <SponsorTable conferenceId={conferenceId} />
      </section>

      <section className="w-full min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <SponsorForm conferenceId={conferenceId} />
      </section>
    </main>
  );
}
