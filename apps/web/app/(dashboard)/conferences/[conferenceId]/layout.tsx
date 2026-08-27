'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { use } from 'react';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useConference } from '@/hooks/use-conferences';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '', label: 'Overview' },
  { href: '/settings', label: 'Settings' },
  { href: '/tracks', label: 'Tracks' },
  { href: '/form-builder', label: 'Form builder' },
  { href: '/abstracts', label: 'Abstracts' },
  { href: '/reviewers', label: 'Reviewers' },
  { href: '/review-assignments', label: 'Review assignments' },
  { href: '/registration-categories', label: 'Registration' },
  { href: '/payments', label: 'Payments' },
  { href: '/program', label: 'Program' },
  { href: '/speakers', label: 'Speakers' },
  { href: '/checkins', label: 'Check-ins' },
  { href: '/certificates', label: 'Certificates' },
  { href: '/sponsors', label: 'Sponsors' },
  { href: '/exhibitors', label: 'Exhibitors' },
  { href: '/reports', label: 'Reports' },
  { href: '/exports', label: 'Exports' },
  { href: '/imports', label: 'Imports' },
];

export default function ConferenceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ conferenceId: string }>;
}) {
  const { conferenceId } = use(params);
  const conferenceQuery = useConference(conferenceId);
  const pathname = usePathname();

  return (
    <AsyncBoundary query={conferenceQuery}>
      {(conference) => (
        <div className="space-y-4">
          {conference.status === 'DRAFT' ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
              Not visible to participants yet — this conference hasn&apos;t been published.
            </div>
          ) : null}
          <h1 className="text-xl font-semibold">{conference.name}</h1>
          <nav className="flex gap-4 border-b">
            {TABS.map((tab) => {
              const href = `/conferences/${conferenceId}${tab.href}`;
              const isActive = tab.href === '' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={tab.href}
                  href={href}
                  className={cn(
                    'border-b-2 px-1 pb-2 text-sm',
                    isActive
                      ? 'border-foreground font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          {children}
        </div>
      )}
    </AsyncBoundary>
  );
}
