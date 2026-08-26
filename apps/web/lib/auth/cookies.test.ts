import { describe, expect, it } from 'vitest';
import {
  ACCESS_TOKEN_COOKIE,
  ACTIVE_ORG_COOKIE,
  authCookieOptions,
  orgCookieOptions,
  REFRESH_TOKEN_COOKIE,
} from './cookies';

describe('cookie name constants', () => {
  it('are distinct', () => {
    const names = [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, ACTIVE_ORG_COOKIE];
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('authCookieOptions', () => {
  it('is httpOnly, sameSite lax, and path / in development', () => {
    const options = authCookieOptions({ nodeEnv: 'development' });

    expect(options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('sets secure: true in production', () => {
    const options = authCookieOptions({ nodeEnv: 'production' });

    expect(options.secure).toBe(true);
  });

  it('includes an explicit domain when one is configured', () => {
    const options = authCookieOptions({ nodeEnv: 'production', domain: '.example.com' });

    expect(options.domain).toBe('.example.com');
  });

  it('omits the domain key entirely when none is configured', () => {
    const options = authCookieOptions({ nodeEnv: 'production' });

    expect(options).not.toHaveProperty('domain');
  });
});

describe('orgCookieOptions', () => {
  it('is NOT httpOnly — the active org id is not a secret', () => {
    const options = orgCookieOptions({ nodeEnv: 'production' });

    expect(options.httpOnly).toBe(false);
  });

  it('still sets secure/sameSite/path the same way auth cookies do', () => {
    const options = orgCookieOptions({ nodeEnv: 'production' });

    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
  });
});
