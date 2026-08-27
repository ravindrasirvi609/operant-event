/**
 * Duplicated from apps/api/src/common/utils/sequence-number.util.ts — a
 * tiny pure function, not worth a shared package extraction. Keep both
 * copies identical if either ever changes.
 */
export function formatSequenceNumber(prefix: string, sequence: number, width = 6): string {
  return `${prefix}-${String(sequence).padStart(width, '0')}`;
}
