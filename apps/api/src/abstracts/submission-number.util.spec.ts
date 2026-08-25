import {
  formatSubmissionNumber,
  isUniqueConstraintViolation,
} from './submission-number.util';

describe('formatSubmissionNumber', () => {
  it('pads small sequence numbers to 6 digits', () => {
    expect(formatSubmissionNumber(1)).toBe('A-000001');
  });

  it('does not truncate a sequence number longer than 6 digits', () => {
    expect(formatSubmissionNumber(1234567)).toBe('A-1234567');
  });

  it('formats a mid-range sequence number correctly', () => {
    expect(formatSubmissionNumber(123)).toBe('A-000123');
  });
});

describe('isUniqueConstraintViolation', () => {
  it('is true for a Prisma-style P2002 error', () => {
    expect(isUniqueConstraintViolation({ code: 'P2002' })).toBe(true);
  });

  it('is false for any other error shape', () => {
    expect(isUniqueConstraintViolation({ code: 'P2025' })).toBe(false);
    expect(isUniqueConstraintViolation(new Error('boom'))).toBe(false);
    expect(isUniqueConstraintViolation(null)).toBe(false);
  });
});
