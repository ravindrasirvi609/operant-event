import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { loadEnv } from '@/lib/env';
import { clearAuthCookies } from '@/lib/auth/apply-token-cookies';
import { REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookies';

/** A user must always be able to log out client-side even if the backend is unreachable — cookies clear regardless. */
export async function POST() {
  const env = loadEnv();
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    await fetch(`${env.BACKEND_API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
