'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { use } from 'react';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useConference } from '@/hooks/use-conferences';
import { cn } from '@/lib/utils';
import {
  BarChart3, BookOpen, CalendarDays, CheckSquare, ClipboardList, FileInput, FileOutput, FormInput,
  Handshake, LayoutDashboard, ListChecks, Mic2, Presentation, Receipt, ScanLine, Settings, ShieldCheck,
  Ticket, Users, WalletCards,
} from 'lucide-react';

const TABS = [
  { href: '', label: 'Overview', icon: LayoutDashboard }, { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/tracks', label: 'Tracks', icon: ListChecks }, { href: '/form-builder', label: 'Form builder', icon: FormInput },
  { href: '/abstracts', label: 'Abstracts', icon: BookOpen }, { href: '/reviewers', label: 'Reviewers', icon: Users },
  { href: '/review-assignments', label: 'Review assignments', icon: ClipboardList }, { href: '/registration-categories', label: 'Registration', icon: Ticket },
  { href: '/payments', label: 'Payments', icon: WalletCards }, { href: '/program', label: 'Program', icon: Presentation },
  { href: '/speakers', label: 'Speakers', icon: Mic2 }, { href: '/checkins', label: 'Check-ins', icon: ScanLine },
  { href: '/certificates', label: 'Certificates', icon: ShieldCheck }, { href: '/sponsors', label: 'Sponsors', icon: Handshake },
  { href: '/exhibitors', label: 'Exhibitors', icon: Users }, { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/exports', label: 'Exports', icon: FileOutput }, { href: '/imports', label: 'Imports', icon: FileInput },
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
                    'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-1 pb-2 text-sm',
                    isActive
                      ? 'border-foreground font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <tab.icon className="size-4" />
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
