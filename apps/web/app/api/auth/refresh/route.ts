import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { loadEnv } from '@/lib/env';
import { ApiError } from '@/lib/api/backend';
import { applyTokenCookies, clearAuthCookies } from '@/lib/auth/apply-token-cookies';
import { REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { refreshTokens } from '@/lib/auth/refresh';

/** Used by the proxy's own refresh-on-401 retry, and available for a manual client-triggered refresh. */
export async function POST() {
  const env = loadEnv();
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token present.' }, { status: 401 });
  }

  try {
    const tokens = await refreshTokens(env.BACKEND_API_URL, refreshToken);
    const response = NextResponse.json({ ok: true });
    applyTokenCookies(response, tokens, { nodeEnv: env.NODE_ENV, domain: env.COOKIE_DOMAIN });
    return response;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : 'Refresh failed.';
    const response = NextResponse.json({ message }, { status });
    clearAuthCookies(response);
    return response;
  }
}
