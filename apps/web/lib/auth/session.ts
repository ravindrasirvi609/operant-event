import 'server-only';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from './cookies';

export interface Session {
  isAuthenticated: boolean;
}

/**
 * Deliberately does not decode the JWT for identity — a page that needs
 * the user's name/email calls `GET organizations/me` (or a future
 * `auth/me`), keeping one source of truth instead of two.
 */
export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  return { isAuthenticated: Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value) };
}
