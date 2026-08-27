'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Its own light layout, same reasoning as `(author)`/`(reviewer)`:
 * `RegistrationsController`/`OrdersController`/the owner-facing payment
 * and invoice routes all run `JwtAuthGuard` only — a registrant with no
 * organization membership still needs this UI to work, so it never
 * inherits the org-switcher shell.
 */
export default function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">Operant Event</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
