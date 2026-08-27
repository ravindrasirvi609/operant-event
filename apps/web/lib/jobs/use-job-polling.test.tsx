import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useJobPolling } from './use-job-polling';

function Wrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useJobPolling', () => {
  it('stops polling once a terminal status is reached', async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce({ status: 'QUEUED' })
      .mockResolvedValueOnce({ status: 'RUNNING' })
      .mockResolvedValueOnce({ status: 'DONE' });

    renderHook(
      () =>
        useJobPolling(['job-1'], queryFn, {
          intervalMs: 1000,
          terminalStatuses: ['DONE', 'FAILED'],
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(3));

    // Now DONE — further time advancing must not trigger another fetch.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(queryFn).toHaveBeenCalledTimes(3);
  });

  it('stops polling after maxAttempts even if the job never reaches a terminal status', async () => {
    const queryFn = vi.fn().mockResolvedValue({ status: 'RUNNING' });

    const { result } = renderHook(
      () =>
        useJobPolling(['job-2'], queryFn, {
          intervalMs: 1000,
          terminalStatuses: ['DONE', 'FAILED'],
          maxAttempts: 2,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // Capped at maxAttempts (2 total fetches: the initial one + one poll) — no third call.
    expect(queryFn).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.exceededMaxAttempts).toBe(true));
  });
});
