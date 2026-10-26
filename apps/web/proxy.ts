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
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
      request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
  );

  const decision = decideRouteAccess(request.nextUrl.pathname, hasSession);

  if (decision.action === 'redirect') {
    const redirectUrl = new URL(decision.to, request.url);

    // Preserve the page the user originally wanted to visit.
    // Example:
    // /my-abstracts -> /login?returnTo=/my-abstracts
    //
    // This allows the same account to act as both Author and Reviewer:
    // /my-abstracts -> login -> /my-abstracts
    // /my-reviews  -> login -> /my-reviews
    if (decision.to === '/login') {
      redirectUrl.searchParams.set(
        'returnTo',
        request.nextUrl.pathname + request.nextUrl.search,
      );
    }

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};