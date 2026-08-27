'use client';

import { useFileDownloadUrl } from '@/hooks/use-files';
import type { JobStatus } from '@/lib/jobs/types';

interface JobStatusPollerProps {
  status: JobStatus;
  error: string | null;
  resultFileId: string | null;
  exceededMaxAttempts: boolean;
  /** Rendered below the status line — e.g. rowsProcessed/rowsFailed for imports. */
  extra?: React.ReactNode;
}

export function JobStatusPoller({ status, error, resultFileId, exceededMaxAttempts, extra }: JobStatusPollerProps) {
  const downloadUrlQuery = useFileDownloadUrl(status === 'DONE' ? resultFileId : null);

  if (status === 'FAILED') {
    return (
      <p role="alert" className="text-sm text-destructive">
        Failed: {error ?? 'Unknown error.'}
      </p>
    );
  }

  if (status === 'DONE') {
    return (
      <div className="space-y-2">
        <p role="status" className="text-sm font-medium">
          Done.
        </p>
        {extra}
        {resultFileId ? (
          downloadUrlQuery.data ? (
            <a href={downloadUrlQuery.data.url} className="text-sm text-primary underline">
              Download result
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Preparing download link…</p>
          )
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Status: {status}…</p>
      {extra}
      {exceededMaxAttempts ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
          Taking longer than expected. This isn&apos;t necessarily a client-side error — check back later or contact
          an admin if it stays {status} for an unusually long time.
        </p>
      ) : null}
    </div>
  );
}
