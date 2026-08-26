import { describe, expect, it } from 'vitest';
import { buildCookieString, readCookieValue } from './browser-cookies';

describe('readCookieValue', () => {
  it('finds a cookie value among several', () => {
    expect(readCookieValue('a=1; active_org_id=org-42; b=2', 'active_org_id')).toBe('org-42');
  });

  it('returns null when the cookie is absent', () => {
    expect(readCookieValue('a=1; b=2', 'active_org_id')).toBeNull();
  });

  it('decodes a URL-encoded value', () => {
    expect(readCookieValue('active_org_id=org%2042', 'active_org_id')).toBe('org 42');
  });

  it('handles an empty cookie string', () => {
    expect(readCookieValue('', 'active_org_id')).toBeNull();
  });

  it('does not partially match a cookie whose name is a suffix of another', () => {
    expect(readCookieValue('other_active_org_id=wrong; active_org_id=right', 'active_org_id')).toBe('right');
  });
});

describe('buildCookieString', () => {
  it('encodes the value and sets path=/ and samesite=lax', () => {
    const cookie = buildCookieString('active_org_id', 'org 42', { secure: false });

    expect(cookie).toBe('active_org_id=org%2042; path=/; samesite=lax');
  });

  it('appends secure when secure is true', () => {
    const cookie = buildCookieString('active_org_id', 'org-42', { secure: true });

    expect(cookie).toContain('; secure');
  });
});
