/** SRS §36: one manual-search field, not two — this decides which `CheckinDto` field to send. */
export function resolveSearchIdentifier(query: string): { email: string } | { registrationNumber: string } {
  const trimmed = query.trim();
  return trimmed.includes('@') ? { email: trimmed } : { registrationNumber: trimmed };
}
