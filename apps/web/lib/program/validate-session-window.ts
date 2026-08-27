/** Mirrors `ScheduleConflictService.assertValidWindow` exactly — the backend still enforces this at 400 if bypassed. */
export function validateSessionWindow(startTime: string, endTime: string): string | null {
  if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
    return 'End time must be after start time.';
  }
  return null;
}
