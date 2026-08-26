import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { decideRouteAccess } from '@/lib/auth/route-protection';

// Next.js 16 renamed `middleware` to `proxy` (the file convention, the
// exported function name, and its default runtime — Node.js, not Edge).
// This is route-group protection ONLY — no token refresh here; that lives
// entirely in the proxy Route Handler's refresh-on-401 retry
// (app/api/proxy/[...path]/route.ts), which is the single place that
// logic exists.
export function proxy(request: NextRequest) {
  const hasSession = Boolean(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
  );
  const decision = decideRouteAccess(request.nextUrl.pathname, hasSession);

  if (decision.action === 'redirect') {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
