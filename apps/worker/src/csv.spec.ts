import { fromCsv, toCsv } from './csv';

describe('toCsv', () => {
  it('returns an empty string for an empty row set, not a header-only CSV', () => {
    expect(toCsv([])).toBe('');
  });

  it('writes a header row and correctly escapes a value containing a comma', () => {
    const csv = toCsv([{ name: 'Doe, Jane', amount: 100 }]);

    expect(csv).toBe('name,amount\n"Doe, Jane",100\n');
  });
});

describe('fromCsv', () => {
  it('round-trips what toCsv wrote, including the escaped comma', () => {
    const csv = toCsv([{ name: 'Doe, Jane', amount: '100' }]);

    expect(fromCsv(csv)).toEqual([{ name: 'Doe, Jane', amount: '100' }]);
  });
});
