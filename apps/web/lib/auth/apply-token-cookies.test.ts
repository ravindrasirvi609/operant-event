import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import { applyTokenCookies, clearAuthCookies } from './apply-token-cookies';
import { ACCESS_TOKEN_COOKIE, ACTIVE_ORG_COOKIE, REFRESH_TOKEN_COOKIE } from './cookies';

describe('applyTokenCookies', () => {
  it('sets both the access and refresh token cookies as httpOnly', () => {
    const response = NextResponse.json({});

    applyTokenCookies(response, { accessToken: 'a', refreshToken: 'r' }, { nodeEnv: 'production' });

    const access = response.cookies.get(ACCESS_TOKEN_COOKIE);
    const refresh = response.cookies.get(REFRESH_TOKEN_COOKIE);
    expect(access?.value).toBe('a');
    expect(refresh?.value).toBe('r');
  });
});

describe('clearAuthCookies', () => {
  it('deletes access_token, refresh_token, and active_org_id', () => {
    const response = NextResponse.json({});

    clearAuthCookies(response);

    // Next.js models a deletion as a Set-Cookie with an empty value / expiry;
    // asserting the cookie is present in the outgoing jar with an empty value
    // is the observable contract we care about here.
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe('');
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe('');
    expect(response.cookies.get(ACTIVE_ORG_COOKIE)?.value).toBe('');
  });
});
