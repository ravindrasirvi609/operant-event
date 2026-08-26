import { refreshTokens, type TokenPair } from '../auth/refresh';

export interface BuildForwardRequestInput {
  backendApiUrl: string;
  path: string;
  method: string;
  /** The incoming browser request's headers — only content-type is copied through; Authorization/Cookie never are. */
  headers: Headers;
  body: BodyInit | null;
  accessToken: string | undefined;
  activeOrgId: string | undefined;
}

export interface ForwardRequest {
  url: string;
  init: RequestInit;
}

/** The only place Authorization/x-organization-id get attached to an outgoing backend request. */
export function buildForwardRequest(input: BuildForwardRequestInput): ForwardRequest {
  const headers = new Headers();
  const contentType = input.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }
  if (input.accessToken) {
    headers.set('authorization', `Bearer ${input.accessToken}`);
  }
  if (input.activeOrgId) {
    headers.set('x-organization-id', input.activeOrgId);
  }

  return {
    url: `${input.backendApiUrl}/${input.path}`,
    init: { method: input.method, headers, body: input.body },
  };
}

export interface ProxyRequestDeps {
  backendApiUrl: string;
  accessToken: string | undefined;
  refreshToken: string | undefined;
  activeOrgId: string | undefined;
  fetchImpl: typeof fetch;
}

export interface ProxyRequestResult {
  response: Response;
  /** Set only when a refresh actually happened — the caller must persist these as new cookies. */
  refreshedTokens?: TokenPair;
}

/**
 * Forwards one request to the backend. On a 401, refreshes the token pair
 * once and retries the same request exactly once — a second 401 (either the
 * refresh call itself, or the retried request) is returned to the caller
 * as-is, never retried further.
 */
export async function proxyRequest(
  path: string,
  method: string,
  headers: Headers,
  body: BodyInit | null,
  deps: ProxyRequestDeps,
): Promise<ProxyRequestResult> {
  const first = buildForwardRequest({
    backendApiUrl: deps.backendApiUrl,
    path,
    method,
    headers,
    body,
    accessToken: deps.accessToken,
    activeOrgId: deps.activeOrgId,
  });
  const response = await deps.fetchImpl(first.url, first.init);

  if (response.status !== 401 || !deps.refreshToken) {
    return { response };
  }

  let refreshedTokens: TokenPair;
  try {
    refreshedTokens = await refreshTokens(deps.backendApiUrl, deps.refreshToken, deps.fetchImpl);
  } catch {
    return { response };
  }

  const retry = buildForwardRequest({
    backendApiUrl: deps.backendApiUrl,
    path,
    method,
    headers,
    body,
    accessToken: refreshedTokens.accessToken,
    activeOrgId: deps.activeOrgId,
  });
  const retryResponse = await deps.fetchImpl(retry.url, retry.init);
  return { response: retryResponse, refreshedTokens };
}
