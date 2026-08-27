'use client';

import { useSyncExternalStore } from 'react';
import { readJobHistory } from './job-history-cache';

function subscribe(): () => void {
  return () => {};
}

/** SSR-safe read of the session-local job-id cache (see job-history-cache.ts for why this isn't a real backend history). */
export function useJobHistory(kind: 'exports' | 'imports', conferenceId: string): string[] {
  return useSyncExternalStore(
    subscribe,
    () => readJobHistory(kind, conferenceId),
    () => [],
  );
}
