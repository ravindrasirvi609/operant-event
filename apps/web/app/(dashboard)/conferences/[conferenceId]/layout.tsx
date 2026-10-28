'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { use, useState } from 'react';

import { AsyncBoundary } from '@/components/query/async-boundary';
import { useConference } from '@/hooks/use-conferences';
import { cn } from '@/lib/utils';

import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileInput,
  FileOutput,
  FormInput,
  Handshake,
  LayoutDashboard,
  ListChecks,
  Menu,
  Mic2,
  Presentation,
  ScanLine,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

const TABS = [
  { href: '', label: 'Overview', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/tracks', label: 'Tracks', icon: ListChecks },
  { href: '/form-builder', label: 'Form builder', icon: FormInput },
  { href: '/abstracts', label: 'Abstracts', icon: BookOpen },
  { href: '/reviewers', label: 'Reviewers', icon: Users },
  {
    href: '/review-assignments',
    label: 'Review assignments',
    icon: ClipboardList,
  },
  {
    href: '/registration-categories',
    label: 'Registration',
    icon: Ticket,
  },
  { href: '/payments', label: 'Payments', icon: WalletCards },
  { href: '/program', label: 'Program', icon: Presentation },
  { href: '/speakers', label: 'Speakers', icon: Mic2 },
  { href: '/checkins', label: 'Check-ins', icon: ScanLine },
  { href: '/certificates', label: 'Certificates', icon: ShieldCheck },
  { href: '/sponsors', label: 'Sponsors', icon: Handshake },
  { href: '/exhibitors', label: 'Exhibitors', icon: Users },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/exports', label: 'Exports', icon: FileOutput },
  { href: '/imports', label: 'Imports', icon: FileInput },
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentTab =
    TABS.find((tab) => {
      const href = `/conferences/${conferenceId}${tab.href}`;

      return tab.href === ''
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);
    }) ?? TABS[0];

  const CurrentIcon = currentTab.icon;

  return (
    <AsyncBoundary query={conferenceQuery}>
      {(conference) => (
        <div className="w-full">
          {conference.status === 'DRAFT' ? (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
              Not visible to participants yet — this conference hasn&apos;t
              been published.
            </div>
          ) : null}

          {/* Mobile conference menu */}
          <div className="mb-5 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm"
              aria-expanded={mobileMenuOpen}
            >
              <span className="flex min-w-0 items-center gap-3">
                {mobileMenuOpen ? (
                  <X className="size-5 shrink-0" />
                ) : (
                  <Menu className="size-5 shrink-0" />
                )}

                <span className="truncate font-semibold">
                  {mobileMenuOpen
                    ? 'Conference Menu'
                    : currentTab.label}
                </span>
              </span>

              <span className="text-xs text-muted-foreground">
                {mobileMenuOpen ? 'Close' : 'Open'}
              </span>
            </button>

            {mobileMenuOpen ? (
              <div className="mt-2 rounded-xl border bg-card p-2 shadow-lg">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {TABS.map((tab) => {
                    const href = `/conferences/${conferenceId}${tab.href}`;

                    const isActive =
                      tab.href === ''
                        ? pathname === href
                        : pathname === href ||
                          pathname.startsWith(`${href}/`);

                    const Icon = tab.icon;

                    return (
                      <Link
                        key={tab.href}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{tab.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Desktop conference layout */}
          <div className="hidden items-start gap-6 lg:flex">
            {/* LEFT SIDEBAR */}
            <aside className="sticky top-6 w-64 shrink-0">
              <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                {/* Conference menu header */}
                <div className="border-b px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                      <Menu className="size-5 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Conference
                      </p>

                      <p className="truncate text-sm font-semibold">
                        Menu
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="p-2">
                  {TABS.map((tab) => {
                    const href = `/conferences/${conferenceId}${tab.href}`;

                    const isActive =
                      tab.href === ''
                        ? pathname === href
                        : pathname === href ||
                          pathname.startsWith(`${href}/`);

                    const Icon = tab.icon;

                    return (
                      <Link
                        key={tab.href}
                        href={href}
                        className={cn(
                          'mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{tab.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* RIGHT CONTENT */}
            <main className="min-w-0 flex-1">
              <div className="mb-6 rounded-2xl border bg-card px-6 py-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <CurrentIcon className="size-6 text-primary" />

                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">
                      Conference
                    </p>

                    <h1 className="truncate text-xl font-semibold tracking-tight">
                      {currentTab.label}
                    </h1>
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile content */}
          <div className="lg:hidden">
            <div className="mb-5 rounded-2xl border bg-card px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <CurrentIcon className="size-5 text-primary" />

                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Conference
                  </p>

                  <h1 className="truncate text-lg font-semibold">
                    {currentTab.label}
                  </h1>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              {children}
            </div>
          </div>
        </div>
      )}
    </AsyncBoundary>
  );
}