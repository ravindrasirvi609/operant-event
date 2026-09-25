'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { cn } from '@/lib/utils';
import { Building2, CalendarDays, LogOut, Monitor, Settings, Users, Mail } from 'lucide-react';

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeOrgId } = useActiveOrganization();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="flex items-center gap-4">
      <Link
        href="/"
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap text-sm',
          pathname === '/' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <CalendarDays className="size-4" />
        Conferences
      </Link>
      {activeOrgId ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-1.5" />}>
            <Building2 className="size-4" />
            Organization
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem render={<Link href={`/organizations/${activeOrgId}/settings`} />}>
              <Settings className="size-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/organizations/${activeOrgId}/members`} />}>
              <Users className="size-4" /> Members
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/organizations/${activeOrgId}/roles`} />}>
              <Users className="size-4" /> Roles
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/organizations/${activeOrgId}/email-templates`} />}>
              <Mail className="size-4" /> Email templates
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Link
        href="/account/sessions"
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap text-sm',
          pathname === '/account/sessions' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Monitor className="size-4" /> Sessions
      </Link>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="size-4" /> Log out
      </Button>
    </nav>
  );
}
