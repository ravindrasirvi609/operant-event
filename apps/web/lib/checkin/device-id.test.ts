import { beforeEach, describe, expect, it } from 'vitest';
import { getDeviceId } from './device-id';

beforeEach(() => {
  window.localStorage.clear();
});

describe('getDeviceId', () => {
  it('generates and persists a device id on first call', () => {
    const id = getDeviceId();

    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(window.localStorage.getItem('operant-event:device-id')).toBe(id);
  });

  it('returns the same id on every later call, not a new one per session', () => {
    const first = getDeviceId();
    const second = getDeviceId();

    expect(second).toBe(first);
  });
});
