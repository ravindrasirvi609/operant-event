/** SRS §10.3: human-friendly submission number, e.g. A-000123. */
export function formatSubmissionNumber(sequence: number): string {
  return `A-${String(sequence).padStart(6, '0')}`;
}

/**
 * Duck-typed rather than `instanceof Prisma.PrismaClientKnownRequestError`
 * so callers can drive the retry loop with a plain mock error in tests
 * without depending on Prisma's exact error-class internals.
 */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
