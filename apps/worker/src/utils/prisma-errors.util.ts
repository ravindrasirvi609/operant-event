/**
 * Duplicated from apps/api/src/common/utils/prisma-errors.util.ts — a
 * tiny pure function, not worth a shared package extraction. Keep both
 * copies identical if either ever changes.
 */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
