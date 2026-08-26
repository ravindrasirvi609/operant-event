'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface AsyncBoundaryProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  /** Rendered instead of `children` when the data is empty. */
  empty?: ReactNode;
  /** Defaults to "data is an array with length 0" — override for non-array shapes. */
  isEmpty?: (data: T) => boolean;
}

/**
 * The one place every list/detail page gets its loading/error/empty state
 * from (SRS §41 DoD: "UI handles loading, empty, validation, error and
 * success states") — no page hand-rolls its own three-state branch.
 */
export function AsyncBoundary<T>({ query, children, empty, isEmpty }: AsyncBoundaryProps<T>) {
  if (query.isPending) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (query.isError) {
    const message = query.error instanceof Error ? query.error.message : 'Something went wrong.';
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <p>{message}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const data = query.data as T;
  const dataIsEmpty = isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0;
  if (dataIsEmpty && empty !== undefined) {
    return <>{empty}</>;
  }

  return <>{children(data)}</>;
}
