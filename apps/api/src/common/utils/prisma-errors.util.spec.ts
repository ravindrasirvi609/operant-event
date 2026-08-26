import { isUniqueConstraintViolation } from './prisma-errors.util';

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
