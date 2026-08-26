'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { cn } from '@/lib/utils';

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
          'text-sm',
          pathname === '/' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Conferences
      </Link>
      {activeOrgId ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>Organization</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem render={<Link href={`/organizations/${activeOrgId}/settings`} />}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/organizations/${activeOrgId}/members`} />}>
              Members
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/organizations/${activeOrgId}/roles`} />}>Roles</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Link
        href="/account/sessions"
        className={cn(
          'text-sm',
          pathname === '/account/sessions' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Sessions
      </Link>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        Log out
      </Button>
    </nav>
  );
}
