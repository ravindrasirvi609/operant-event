/** Human-friendly business identifiers, e.g. REG-000123, ORD-000045, INV-000009. */
export function formatSequenceNumber(
  prefix: string,
  sequence: number,
  width = 6,
): string {
  return `${prefix}-${String(sequence).padStart(width, '0')}`;
}
