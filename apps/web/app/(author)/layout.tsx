'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Deliberately its own light layout — no org switcher, no sidebar. Pages
 * under this group call author-facing backend routes
 * (`abstracts/mine`, `abstracts/:id/*`) that run `JwtAuthGuard` only and
 * never send `x-organization-id`; inheriting `<AppShell>` here would
 * misleadingly imply an org context these pages don't have.
 */
export default function AuthorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold">Operant Event</span>
          <Link href="/my-abstracts" className="text-sm text-muted-foreground hover:text-foreground">
            My abstracts
          </Link>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
