import { parseApiResponse } from '../api/backend';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Shared by the login Route Handler (to mint the first token pair) and the
 * proxy's refresh-on-401 retry (`app/api/proxy/[...path]/route.ts`) — one
 * place that knows how to talk to `auth/refresh`.
 */
export async function refreshTokens(
  backendApiUrl: string,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenPair> {
  const response = await fetchImpl(`${backendApiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return parseApiResponse<TokenPair>(response);
}
