import { describe, expect, it } from 'vitest';
import { resolveSearchIdentifier } from './resolve-search-identifier';

describe('resolveSearchIdentifier', () => {
  it('treats a value containing "@" as an email', () => {
    expect(resolveSearchIdentifier('jane@example.com')).toEqual({ email: 'jane@example.com' });
  });

  it('treats a value without "@" as a registration number', () => {
    expect(resolveSearchIdentifier('REG-000123')).toEqual({ registrationNumber: 'REG-000123' });
  });

  it('trims surrounding whitespace before deciding', () => {
    expect(resolveSearchIdentifier('  REG-000123  ')).toEqual({ registrationNumber: 'REG-000123' });
  });
});
