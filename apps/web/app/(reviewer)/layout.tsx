'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Its own light layout, same reasoning as `(author)`: `review-assignments/mine`,
 * `:id/decline`, `:id/declare-conflict`, and `:id/review` all run
 * `JwtAuthGuard` only — a reviewer with no organization membership
 * still needs this UI to work, so it never inherits the org-switcher shell.
 */
export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
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
          <Link href="/my-reviews" className="text-sm text-muted-foreground hover:text-foreground">
            My reviews
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
