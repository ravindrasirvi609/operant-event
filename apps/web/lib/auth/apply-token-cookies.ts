import type { NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE, ACTIVE_ORG_COOKIE, authCookieOptions, REFRESH_TOKEN_COOKIE } from './cookies';
import type { TokenPair } from './refresh';

interface CookieEnv {
  nodeEnv: string;
  domain?: string;
}

export function applyTokenCookies(response: NextResponse, tokens: TokenPair, env: CookieEnv): void {
  const options = authCookieOptions(env);
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, options);
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, options);
}

/** Logout must always succeed client-side, even if the backend call fails — clear regardless. */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(ACTIVE_ORG_COOKIE);
}
