import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/backend';
import { refreshTokens } from './refresh';

function fakeFetch(response: Response): typeof fetch {
  return vi.fn().mockResolvedValue(response) as unknown as typeof fetch;
}

describe('refreshTokens', () => {
  it('posts the refresh token to auth/refresh and returns the new token pair', async () => {
    const response = new Response(
      JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
    const fetchImpl = fakeFetch(response);

    const result = await refreshTokens('http://backend/api/v1', 'old-refresh', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith('http://backend/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'old-refresh' }),
    });
    expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
  });

  it('throws an ApiError when the refresh token is rejected', async () => {
    const response = new Response(JSON.stringify({ message: 'Invalid refresh token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
    const fetchImpl = fakeFetch(response);

    await expect(refreshTokens('http://backend/api/v1', 'dead-refresh', fetchImpl)).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
