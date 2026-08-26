/** SRS §10.3: human-friendly submission number, e.g. A-000123. */
export function formatSubmissionNumber(sequence: number): string {
  return `A-${String(sequence).padStart(6, '0')}`;
}
