import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

describe('loadEnv', () => {
  it('parses a valid environment', () => {
    const env = loadEnv({
      BACKEND_API_URL: 'http://localhost:3001/api/v1',
      NODE_ENV: 'development',
    });

    expect(env.BACKEND_API_URL).toBe('http://localhost:3001/api/v1');
  });

  it('defaults COOKIE_DOMAIN to undefined when not set', () => {
    const env = loadEnv({
      BACKEND_API_URL: 'http://localhost:3001/api/v1',
      NODE_ENV: 'development',
    });

    expect(env.COOKIE_DOMAIN).toBeUndefined();
  });

  it('throws a readable error when BACKEND_API_URL is missing', () => {
    expect(() => loadEnv({ NODE_ENV: 'development' })).toThrow(/BACKEND_API_URL/);
  });

  it('throws a readable error when BACKEND_API_URL is not a valid URL', () => {
    expect(() => loadEnv({ BACKEND_API_URL: 'not-a-url', NODE_ENV: 'development' })).toThrow(
      /BACKEND_API_URL/,
    );
  });
});
