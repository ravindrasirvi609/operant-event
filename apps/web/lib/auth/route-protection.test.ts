import { describe, expect, it } from 'vitest';
import { decideRouteAccess } from './route-protection';

describe('decideRouteAccess', () => {
  it('allows a public page (verify-email) regardless of session state', () => {
    expect(decideRouteAccess('/verify-email', false)).toEqual({ action: 'next' });
    expect(decideRouteAccess('/verify-email', true)).toEqual({ action: 'next' });
  });

  it('allows password-reset and its confirm sub-path regardless of session state', () => {
    expect(decideRouteAccess('/password-reset', false)).toEqual({ action: 'next' });
    expect(decideRouteAccess('/password-reset/confirm', true)).toEqual({ action: 'next' });
  });

  it('redirects an authenticated user away from /login to /', () => {
    expect(decideRouteAccess('/login', true)).toEqual({ action: 'redirect', to: '/' });
  });

  it('redirects an authenticated user away from /register to /', () => {
    expect(decideRouteAccess('/register', true)).toEqual({ action: 'redirect', to: '/' });
  });

  it('allows an unauthenticated user to reach /login', () => {
    expect(decideRouteAccess('/login', false)).toEqual({ action: 'next' });
  });

  it('redirects an unauthenticated user away from a protected route to /login', () => {
    expect(decideRouteAccess('/', false)).toEqual({ action: 'redirect', to: '/login' });
    expect(decideRouteAccess('/conferences/conf-1', false)).toEqual({ action: 'redirect', to: '/login' });
  });

  it('allows the public verification page regardless of session state', () => {
    expect(decideRouteAccess('/verify/ABC123', false)).toEqual({ action: 'next' });
    expect(decideRouteAccess('/verify/ABC123', true)).toEqual({ action: 'next' });
  });

  it('allows the public program view page regardless of session state, without opening the rest of /conferences', () => {
    expect(decideRouteAccess('/conferences/conf-1/program/view', false)).toEqual({ action: 'next' });
    expect(decideRouteAccess('/conferences/conf-1/program/view', true)).toEqual({ action: 'next' });
    // The organizer's own /program page (no /view suffix) must stay protected.
    expect(decideRouteAccess('/conferences/conf-1/program', false)).toEqual({ action: 'redirect', to: '/login' });
    expect(decideRouteAccess('/conferences/conf-1/settings', false)).toEqual({ action: 'redirect', to: '/login' });
  });

  it('allows an authenticated user to reach a protected route', () => {
    expect(decideRouteAccess('/', true)).toEqual({ action: 'next' });
  });
});
