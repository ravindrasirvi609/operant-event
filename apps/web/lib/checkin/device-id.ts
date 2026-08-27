const STORAGE_KEY = 'operant-event:device-id';

/** Client-generated, persisted per browser (not per session) so the check-in dashboard can show "scanned by which device" over time. */
export function getDeviceId(): string {
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}
