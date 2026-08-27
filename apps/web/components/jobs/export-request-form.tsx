'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { JobStatusPoller } from '@/components/jobs/job-status-poller';
import { useCreateExport, useExportHistory, useExportJob } from '@/hooks/use-exports';
import { EXPORT_TYPES, type ExportType } from '@/lib/jobs/types';

/** Export history is the real `GET conferences/:conferenceId/exports` list — visible across tabs/devices/sessions, not a session-local cache. */
export function ExportRequestForm({ conferenceId }: { conferenceId: string }) {
  const [type, setType] = useState<ExportType>('ABSTRACTS');
  const createExport = useCreateExport(conferenceId);
  const historyQuery = useExportHistory(conferenceId);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    try {
      await createExport.mutateAsync(type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create export.');
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-end gap-3">
        <Select value={type} onValueChange={(value) => value && setType(value as ExportType)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPORT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button disabled={createExport.isPending} onClick={handleCreate}>
          {createExport.isPending ? 'Requesting…' : 'Request export'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Export history</h2>
        <AsyncBoundary query={historyQuery} empty={<p className="text-sm text-muted-foreground">No exports requested yet.</p>}>
          {(jobs) => (
            <ul className="space-y-3">
              {jobs.map((job) => (
                <li key={job.id} className="rounded-lg border p-3">
                  <ExportJobRow exportId={job.id} type={job.type} createdAt={job.createdAt} />
                </li>
              ))}
            </ul>
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}

function ExportJobRow({ exportId, type, createdAt }: { exportId: string; type: string; createdAt: string }) {
  const job = useExportJob(exportId);
  if (!job.data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {type} · {new Date(createdAt).toLocaleString()}
      </p>
      <JobStatusPoller
        status={job.data.status}
        error={job.data.error}
        resultFileId={job.data.resultFileId}
        exceededMaxAttempts={job.exceededMaxAttempts}
      />
    </div>
  );
}
