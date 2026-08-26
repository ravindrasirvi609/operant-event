import type { ReactNode } from 'react';
import { Nav } from './nav';
import { OrgSwitcher } from './org-switcher';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold">Operant Event</span>
          <Nav />
        </div>
        <OrgSwitcher />
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
