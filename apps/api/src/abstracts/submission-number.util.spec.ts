import { formatSubmissionNumber } from './submission-number.util';

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
