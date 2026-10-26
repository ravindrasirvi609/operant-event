'use client';

import Link from 'next/link';
import { use } from 'react';
import { ArrowRight, FileText, Plus } from 'lucide-react';

export default function AuthorConferencePage({
  params,
}: {
  params: Promise<{ conferenceId: string }>;
}) {
  const { conferenceId } = use(params);

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
        {/* Header */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            PharmSciCon 2027
          </p>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Abstracts
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Submit a new abstract or manage your existing submissions.
            </p>
          </div>
        </div>

        {/* Abstract Actions */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Submit New Abstract */}
          <Link
            href={`/author/conferences/${conferenceId}/abstracts`}
            className="group rounded-xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              Submit New Abstract
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Start a new abstract submission for PharmSciCon 2027.
            </p>
          </Link>

          {/* My Abstracts */}
          <Link
            href="/my-abstracts"
            className="group rounded-xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              My Abstracts
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              View your submitted abstracts, track their status, and manage
              revisions.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}