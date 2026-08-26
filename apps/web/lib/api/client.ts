import { parseApiResponse } from './backend';

/**
 * Every Client Component call goes through the same-origin
 * `/api/proxy/...` Route Handler — never the real backend origin directly
 * — so the httpOnly access/refresh cookies stay server-side.
 */
async function request<T>(
  method: string,
  path: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<T> {
  const hasBody = body !== undefined;
  const response = await fetchImpl(`/api/proxy/${path}`, {
    method,
    headers: hasBody ? { 'content-type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  return parseApiResponse<T>(response);
}

export function apiGet<T>(path: string, fetchImpl: typeof fetch = fetch): Promise<T> {
  return request<T>('GET', path, undefined, fetchImpl);
}

export function apiPost<T>(path: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<T> {
  return request<T>('POST', path, body, fetchImpl);
}

export function apiPatch<T>(path: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<T> {
  return request<T>('PATCH', path, body, fetchImpl);
}

export function apiPut<T>(path: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<T> {
  return request<T>('PUT', path, body, fetchImpl);
}

export function apiDelete<T>(path: string, fetchImpl: typeof fetch = fetch): Promise<T> {
  return request<T>('DELETE', path, undefined, fetchImpl);
}
