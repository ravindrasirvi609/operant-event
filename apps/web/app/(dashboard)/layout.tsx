import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { getSession } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    redirect('/login');
  }

  return <AppShell>{children}</AppShell>;
}
