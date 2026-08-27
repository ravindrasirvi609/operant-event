/**
 * There is no `GET conferences/:conferenceId/exports` (or `/imports`)
 * list endpoint on the backend — only `POST` create and `GET
 * <kind>/:id` single-job lookup exist. This is a same-tab,
 * session-local memory of job ids created here, NOT a real backend
 * history: a refresh loses nothing already displayed (still cached),
 * but a different tab/device/session sees no history at all, because
 * none exists to fetch.
 */
function storageKey(kind: 'exports' | 'imports', conferenceId: string): string {
  return `operant-event:job-history:${kind}:${conferenceId}`;
}

export function readJobHistory(kind: 'exports' | 'imports', conferenceId: string): string[] {
  const raw = window.sessionStorage.getItem(storageKey(kind, conferenceId));
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export function addJobToHistory(kind: 'exports' | 'imports', conferenceId: string, jobId: string): void {
  const existing = readJobHistory(kind, conferenceId);
  window.sessionStorage.setItem(storageKey(kind, conferenceId), JSON.stringify([jobId, ...existing]));
}
