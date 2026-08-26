import { isWithinWindow, windowsOverlap } from './schedule-conflict.util';

describe('windowsOverlap', () => {
  it('returns true when one window starts before the other ends and vice versa', () => {
    const a = {
      startTime: new Date('2027-01-01T10:00:00Z'),
      endTime: new Date('2027-01-01T11:00:00Z'),
    };
    const b = {
      startTime: new Date('2027-01-01T10:30:00Z'),
      endTime: new Date('2027-01-01T11:30:00Z'),
    };

    expect(windowsOverlap(a, b)).toBe(true);
  });

  it('returns false for two windows that only touch at the boundary', () => {
    const a = {
      startTime: new Date('2027-01-01T10:00:00Z'),
      endTime: new Date('2027-01-01T11:00:00Z'),
    };
    const b = {
      startTime: new Date('2027-01-01T11:00:00Z'),
      endTime: new Date('2027-01-01T12:00:00Z'),
    };

    expect(windowsOverlap(a, b)).toBe(false);
  });

  it('returns false for two windows on entirely different days', () => {
    const a = {
      startTime: new Date('2027-01-01T10:00:00Z'),
      endTime: new Date('2027-01-01T11:00:00Z'),
    };
    const b = {
      startTime: new Date('2027-01-02T10:00:00Z'),
      endTime: new Date('2027-01-02T11:00:00Z'),
    };

    expect(windowsOverlap(a, b)).toBe(false);
  });

  it('returns true when one window fully contains the other', () => {
    const outer = {
      startTime: new Date('2027-01-01T09:00:00Z'),
      endTime: new Date('2027-01-01T12:00:00Z'),
    };
    const inner = {
      startTime: new Date('2027-01-01T10:00:00Z'),
      endTime: new Date('2027-01-01T11:00:00Z'),
    };

    expect(windowsOverlap(outer, inner)).toBe(true);
  });
});

describe('isWithinWindow', () => {
  it('returns true when the inner window is fully inside the outer window', () => {
    const outer = {
      startTime: new Date('2027-01-01T09:00:00Z'),
      endTime: new Date('2027-01-01T12:00:00Z'),
    };
    const inner = {
      startTime: new Date('2027-01-01T10:00:00Z'),
      endTime: new Date('2027-01-01T11:00:00Z'),
    };

    expect(isWithinWindow(inner, outer)).toBe(true);
  });

  it('returns true when the inner window exactly matches the outer window', () => {
    const window = {
      startTime: new Date('2027-01-01T09:00:00Z'),
      endTime: new Date('2027-01-01T12:00:00Z'),
    };

    expect(isWithinWindow(window, window)).toBe(true);
  });

  it('returns false when the inner window starts before the outer window', () => {
    const outer = {
      startTime: new Date('2027-01-01T09:00:00Z'),
      endTime: new Date('2027-01-01T12:00:00Z'),
    };
    const inner = {
      startTime: new Date('2027-01-01T08:00:00Z'),
      endTime: new Date('2027-01-01T11:00:00Z'),
    };

    expect(isWithinWindow(inner, outer)).toBe(false);
  });

  it('returns false when the inner window ends after the outer window', () => {
    const outer = {
      startTime: new Date('2027-01-01T09:00:00Z'),
      endTime: new Date('2027-01-01T12:00:00Z'),
    };
    const inner = {
      startTime: new Date('2027-01-01T10:00:00Z'),
      endTime: new Date('2027-01-01T13:00:00Z'),
    };

    expect(isWithinWindow(inner, outer)).toBe(false);
  });
});
