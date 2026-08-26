import {
  resolveEffectivePricingWindow,
  type PricingWindow,
} from './pricing.util';

const earlyBird: PricingWindow = {
  id: 'early-bird',
  price: 2000,
  startDate: new Date('2027-01-01T00:00:00Z'),
  endDate: new Date('2027-01-31T23:59:59Z'),
};

const regular: PricingWindow = {
  id: 'regular',
  price: 2500,
  startDate: new Date('2027-02-01T00:00:00Z'),
  endDate: new Date('2027-03-01T00:00:00Z'),
};

describe('resolveEffectivePricingWindow', () => {
  it('picks the window whose range contains "now"', () => {
    const result = resolveEffectivePricingWindow(
      [earlyBird, regular],
      new Date('2027-01-15T00:00:00Z'),
    );
    expect(result?.id).toBe('early-bird');
  });

  it('is inclusive of the exact start boundary', () => {
    const result = resolveEffectivePricingWindow(
      [earlyBird, regular],
      earlyBird.startDate,
    );
    expect(result?.id).toBe('early-bird');
  });

  it('is inclusive of the exact end boundary', () => {
    const result = resolveEffectivePricingWindow(
      [earlyBird, regular],
      earlyBird.endDate,
    );
    expect(result?.id).toBe('early-bird');
  });

  it('returns null when no window covers "now"', () => {
    const result = resolveEffectivePricingWindow(
      [earlyBird, regular],
      new Date('2026-12-01T00:00:00Z'),
    );
    expect(result).toBeNull();
  });

  it('picks the most recently started window when ranges overlap', () => {
    const overlapping: PricingWindow = {
      id: 'late-override',
      price: 1500,
      startDate: new Date('2027-01-10T00:00:00Z'),
      endDate: new Date('2027-01-20T00:00:00Z'),
    };
    const result = resolveEffectivePricingWindow(
      [earlyBird, overlapping],
      new Date('2027-01-15T00:00:00Z'),
    );
    expect(result?.id).toBe('late-override');
  });
});
