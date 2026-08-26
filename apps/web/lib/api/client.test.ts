import { describe, expect, it, vi } from 'vitest';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('apiGet', () => {
  it('calls the same-origin proxy path with GET and no body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { id: 'conf-1' }));

    const result = await apiGet<{ id: string }>('conferences/conf-1', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith('/api/proxy/conferences/conf-1', {
      method: 'GET',
      headers: undefined,
      body: undefined,
    });
    expect(result).toEqual({ id: 'conf-1' });
  });
});

describe('apiPost', () => {
  it('sends a JSON body with a content-type header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { id: 'conf-1' }));

    await apiPost('conferences', { name: 'Acme Summit' }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith('/api/proxy/conferences', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Acme Summit' }),
    });
  });

  it('sends no body when called without one', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}));

    await apiPost('conferences/conf-1/publish', undefined, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith('/api/proxy/conferences/conf-1/publish', {
      method: 'POST',
      headers: undefined,
      body: undefined,
    });
  });
});

describe('apiPatch, apiPut, apiDelete', () => {
  it('use their respective HTTP methods', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(200, {})));

    await apiPatch('conferences/conf-1', { name: 'New name' }, fetchImpl);
    await apiPut('conferences/conf-1/settings', { timezone: 'UTC' }, fetchImpl);
    await apiDelete('exhibitor-staff/staff-1', fetchImpl);

    expect(fetchImpl.mock.calls[0][1].method).toBe('PATCH');
    expect(fetchImpl.mock.calls[1][1].method).toBe('PUT');
    expect(fetchImpl.mock.calls[2][1].method).toBe('DELETE');
  });
});

describe('error propagation', () => {
  it('rejects with the parsed ApiError on a non-2xx response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(403, { message: 'Forbidden' }));

    await expect(apiGet('conferences', fetchImpl)).rejects.toMatchObject({ status: 403 });
  });
});
