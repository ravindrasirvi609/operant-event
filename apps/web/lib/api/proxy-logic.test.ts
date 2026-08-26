import { describe, expect, it, vi } from 'vitest';
import { buildForwardRequest, proxyRequest } from './proxy-logic';

describe('buildForwardRequest', () => {
  it('builds the backend URL from the base URL and path', () => {
    const { url } = buildForwardRequest({
      backendApiUrl: 'http://backend/api/v1',
      path: 'organizations/me',
      method: 'GET',
      headers: new Headers(),
      body: null,
      accessToken: undefined,
      activeOrgId: undefined,
    });

    expect(url).toBe('http://backend/api/v1/organizations/me');
  });

  it('attaches Authorization when an access token is present', () => {
    const { init } = buildForwardRequest({
      backendApiUrl: 'http://backend/api/v1',
      path: 'conferences',
      method: 'GET',
      headers: new Headers(),
      body: null,
      accessToken: 'token-123',
      activeOrgId: undefined,
    });

    expect((init.headers as Headers).get('authorization')).toBe('Bearer token-123');
  });

  it('attaches x-organization-id only when an active org is set', () => {
    const withOrg = buildForwardRequest({
      backendApiUrl: 'http://backend/api/v1',
      path: 'conferences',
      method: 'GET',
      headers: new Headers(),
      body: null,
      accessToken: 'token-123',
      activeOrgId: 'org-1',
    });
    const withoutOrg = buildForwardRequest({
      backendApiUrl: 'http://backend/api/v1',
      path: 'conferences',
      method: 'GET',
      headers: new Headers(),
      body: null,
      accessToken: 'token-123',
      activeOrgId: undefined,
    });

    expect((withOrg.init.headers as Headers).get('x-organization-id')).toBe('org-1');
    expect((withoutOrg.init.headers as Headers).has('x-organization-id')).toBe(false);
  });

  it('preserves the incoming content-type header (needed for multipart uploads)', () => {
    const incoming = new Headers({ 'content-type': 'multipart/form-data; boundary=abc' });

    const { init } = buildForwardRequest({
      backendApiUrl: 'http://backend/api/v1',
      path: 'files',
      method: 'POST',
      headers: incoming,
      body: null,
      accessToken: undefined,
      activeOrgId: undefined,
    });

    expect((init.headers as Headers).get('content-type')).toBe('multipart/form-data; boundary=abc');
  });

  it('never forwards an incoming Authorization/Cookie header from the browser', () => {
    const incoming = new Headers({ authorization: 'Bearer client-supplied', cookie: 'a=b' });

    const { init } = buildForwardRequest({
      backendApiUrl: 'http://backend/api/v1',
      path: 'conferences',
      method: 'GET',
      headers: incoming,
      body: null,
      accessToken: undefined,
      activeOrgId: undefined,
    });

    expect((init.headers as Headers).has('authorization')).toBe(false);
    expect((init.headers as Headers).has('cookie')).toBe(false);
  });

  it('carries the method and body through unchanged', () => {
    const { init } = buildForwardRequest({
      backendApiUrl: 'http://backend/api/v1',
      path: 'conferences',
      method: 'POST',
      headers: new Headers(),
      body: JSON.stringify({ name: 'Acme Summit' }),
      accessToken: undefined,
      activeOrgId: undefined,
    });

    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Acme Summit' }));
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('proxyRequest', () => {
  const baseDeps = {
    backendApiUrl: 'http://backend/api/v1',
    activeOrgId: undefined,
  };

  it('forwards the request once and returns the response when it is not a 401', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));

    const result = await proxyRequest('conferences', 'GET', new Headers(), null, {
      ...baseDeps,
      accessToken: 'token-1',
      refreshToken: 'refresh-1',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.response.status).toBe(200);
    expect(result.refreshedTokens).toBeUndefined();
  });

  it('on a 401, refreshes the token pair and retries the original request once', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'jwt expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await proxyRequest('conferences', 'GET', new Headers(), null, {
      ...baseDeps,
      accessToken: 'stale-access',
      refreshToken: 'refresh-1',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    // Third call (the retry) must use the freshly refreshed access token.
    const retryCall = fetchImpl.mock.calls[2];
    const retryHeaders = retryCall[1].headers as Headers;
    expect(retryHeaders.get('authorization')).toBe('Bearer new-access');
    expect(result.response.status).toBe(200);
    expect(result.refreshedTokens).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
  });

  it('on a 401 with no refresh token available, returns the original 401 without retrying', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { message: 'jwt expired' }));

    const result = await proxyRequest('conferences', 'GET', new Headers(), null, {
      ...baseDeps,
      accessToken: 'stale-access',
      refreshToken: undefined,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.response.status).toBe(401);
  });

  it('when the refresh call itself fails, surfaces the original 401 rather than throwing', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'jwt expired' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Invalid refresh token' }));

    const result = await proxyRequest('conferences', 'GET', new Headers(), null, {
      ...baseDeps,
      accessToken: 'stale-access',
      refreshToken: 'dead-refresh',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.response.status).toBe(401);
    expect(result.refreshedTokens).toBeUndefined();
  });

  it('never retries a second time even if the retried request is also a 401', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'jwt expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'still unauthorized' }));

    const result = await proxyRequest('conferences', 'GET', new Headers(), null, {
      ...baseDeps,
      accessToken: 'stale-access',
      refreshToken: 'refresh-1',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.response.status).toBe(401);
  });
});
