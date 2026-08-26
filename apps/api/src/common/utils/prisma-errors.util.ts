/**
 * Duck-typed rather than `instanceof Prisma.PrismaClientKnownRequestError`
 * so callers can drive a retry loop with a plain mock error in tests
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
