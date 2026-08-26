import { describe, expect, it } from 'vitest';
import { ApiError, parseApiResponse } from './backend';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('parseApiResponse', () => {
  it('returns the parsed JSON body on a 200 response', async () => {
    const response = jsonResponse(200, { id: 'org-1', name: 'Acme' });

    const result = await parseApiResponse<{ id: string; name: string }>(response);

    expect(result).toEqual({ id: 'org-1', name: 'Acme' });
  });

  it('returns undefined for a 204 No Content response without reading a body', async () => {
    const response = new Response(null, { status: 204 });

    await expect(parseApiResponse(response)).resolves.toBeUndefined();
  });

  it('throws an ApiError with the backend message and status on a non-2xx response', async () => {
    const response = jsonResponse(403, { statusCode: 403, message: 'Missing x-organization-id header.' });

    await expect(parseApiResponse(response)).rejects.toMatchObject({
      status: 403,
      message: 'Missing x-organization-id header.',
    });
  });

  it('is an instance of ApiError', async () => {
    const response = jsonResponse(404, { message: 'Not found' });

    await expect(parseApiResponse(response)).rejects.toBeInstanceOf(ApiError);
  });

  it('falls back to the response statusText when the error body is not valid JSON', async () => {
    const response = new Response('not json', { status: 500, statusText: 'Internal Server Error' });

    await expect(parseApiResponse(response)).rejects.toMatchObject({
      status: 500,
      message: 'Internal Server Error',
    });
  });
});
