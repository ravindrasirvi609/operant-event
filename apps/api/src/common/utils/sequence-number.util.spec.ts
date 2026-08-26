import { formatSequenceNumber } from './sequence-number.util';

describe('formatSequenceNumber', () => {
  it('pads small sequence numbers to the given width', () => {
    expect(formatSequenceNumber('REG', 1)).toBe('REG-000001');
  });

  it('does not truncate a sequence number longer than the width', () => {
    expect(formatSequenceNumber('ORD', 1234567)).toBe('ORD-1234567');
  });

  it('supports a custom width', () => {
    expect(formatSequenceNumber('INV', 42, 4)).toBe('INV-0042');
  });
});
