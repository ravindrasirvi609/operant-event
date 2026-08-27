'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

export interface UseJobPollingOptions {
  intervalMs: number;
  terminalStatuses: string[];
  /** Never poll forever — a job stuck in a non-terminal status this long should say "taking longer than expected," not silently loop. */
  maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 60;

/**
 * Shared by both exports and imports pages. Polling stops the moment
 * `data.status` is in `terminalStatuses`, or after `maxAttempts` polls,
 * whichever comes first — never an unbounded fixed-interval loop.
 */
export function useJobPolling<T extends { status: string }>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options: UseJobPollingOptions,
) {
  const attempts = useRef(0);
  const lastDataUpdatedAt = useRef<number | null>(null);
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  // `refetchInterval`'s callback runs outside the render phase (invoked by the
  // query observer after a fetch settles), so setting state there is safe —
  // unlike reading/writing `attempts.current` directly in the render body,
  // which React's rules-of-hooks correctly flags.
  const [exceededMaxAttempts, setExceededMaxAttempts] = useState(false);

  const query = useQuery({
    queryKey,
    queryFn,
    refetchInterval: (currentQuery) => {
      const status = currentQuery.state.data?.status;
      if (status === undefined) {
        // No fetch has completed yet — this evaluation isn't tied to a real poll, don't count it.
        return options.intervalMs;
      }
      // The callback can be re-evaluated more often than a real fetch actually
      // completes (e.g. on unrelated re-renders) — only count a genuinely new fetch.
      if (currentQuery.state.dataUpdatedAt !== lastDataUpdatedAt.current) {
        lastDataUpdatedAt.current = currentQuery.state.dataUpdatedAt;
        attempts.current += 1;
      }
      if (options.terminalStatuses.includes(status)) {
        return false;
      }
      if (attempts.current >= maxAttempts) {
        setExceededMaxAttempts(true);
        return false;
      }
      return options.intervalMs;
    },
  });

  return { ...query, exceededMaxAttempts };
}
