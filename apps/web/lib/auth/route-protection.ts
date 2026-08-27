const PUBLIC_PATHS = ['/verify-email', '/password-reset', '/verify'];
/**
 * Suffix-matched, not prefix-matched: `/conferences/:id/program/view` must
 * be public, but `/conferences/:id` and every other dashboard sub-path
 * (settings, tracks, program itself) must stay protected — a broad
 * `/conferences` prefix would open the entire organizer dashboard shell
 * to unauthenticated visitors.
 */
const PUBLIC_PATH_PATTERNS = [/^\/conferences\/[^/]+\/program\/view$/];
const REDIRECT_IF_AUTHENTICATED_PATHS = ['/login', '/register'];

export type RouteAccessDecision = { action: 'next' } | { action: 'redirect'; to: string };

function isUnderPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Pure routing decision — proxy.ts translates this into a NextResponse. */
export function decideRouteAccess(pathname: string, hasSession: boolean): RouteAccessDecision {
  if (PUBLIC_PATHS.some((path) => isUnderPath(pathname, path))) {
    return { action: 'next' };
  }

  if (PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return { action: 'next' };
  }

  if (REDIRECT_IF_AUTHENTICATED_PATHS.some((path) => isUnderPath(pathname, path))) {
    return hasSession ? { action: 'redirect', to: '/' } : { action: 'next' };
  }

  return hasSession ? { action: 'next' } : { action: 'redirect', to: '/login' };
}
