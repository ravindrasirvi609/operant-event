import { describe, expect, it } from 'vitest';
import { validateSessionWindow } from './validate-session-window';

describe('validateSessionWindow', () => {
  it('returns no error when endTime is after startTime', () => {
    expect(validateSessionWindow('2027-03-01T09:00:00Z', '2027-03-01T10:00:00Z')).toBeNull();
  });

  it('returns an error when endTime equals startTime', () => {
    expect(validateSessionWindow('2027-03-01T09:00:00Z', '2027-03-01T09:00:00Z')).toBe(
      'End time must be after start time.',
    );
  });

  it('returns an error when endTime is before startTime', () => {
    expect(validateSessionWindow('2027-03-01T10:00:00Z', '2027-03-01T09:00:00Z')).toBe(
      'End time must be after start time.',
    );
  });
});
