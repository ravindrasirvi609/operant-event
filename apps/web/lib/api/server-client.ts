import 'server-only';
import { cookies } from 'next/headers';
import { loadEnv } from '../env';
import { ACCESS_TOKEN_COOKIE, ACTIVE_ORG_COOKIE } from '../auth/cookies';
import { parseApiResponse } from './backend';

/**
 * For Server Components only — calls the real backend directly (the RSC
 * render already runs server-side, so there's no proxy hop to make). No
 * refresh-on-401 here: a stale SSR'd page just gets refetched on the next
 * navigation rather than duplicating the proxy's retry logic.
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const env = loadEnv();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  if (activeOrgId) {
    headers['x-organization-id'] = activeOrgId;
  }
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${env.BACKEND_API_URL}/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  return parseApiResponse<T>(response);
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, body);
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body);
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}
