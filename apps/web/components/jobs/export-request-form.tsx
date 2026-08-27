'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobStatusPoller } from '@/components/jobs/job-status-poller';
import { useCreateExport, useExportJob } from '@/hooks/use-exports';
import { addJobToHistory } from '@/lib/jobs/job-history-cache';
import { useJobHistory } from '@/lib/jobs/use-job-history';
import { EXPORT_TYPES, type ExportType } from '@/lib/jobs/types';

/**
 * "History" below is session-local only — there is no `GET
 * conferences/:conferenceId/exports` list endpoint, so a different
 * tab/device/session sees nothing here even though the jobs still
 * exist server-side.
 */
export function ExportRequestForm({ conferenceId }: { conferenceId: string }) {
  const [type, setType] = useState<ExportType>('ABSTRACTS');
  const createExport = useCreateExport(conferenceId);
  const [error, setError] = useState<string | null>(null);
  const history = useJobHistory('exports', conferenceId);
  const [localHistory, setLocalHistory] = useState<string[]>(history);

  async function handleCreate() {
    setError(null);
    try {
      const job = await createExport.mutateAsync(type);
      addJobToHistory('exports', conferenceId, job.id);
      setLocalHistory((current) => [job.id, ...current]);
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
        <h2 className="text-sm font-semibold">This session&apos;s requests</h2>
        {localHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exports requested yet this session.</p>
        ) : (
          <ul className="space-y-3">
            {localHistory.map((jobId) => (
              <li key={jobId} className="rounded-lg border p-3">
                <ExportJobRow exportId={jobId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ExportJobRow({ exportId }: { exportId: string }) {
  const job = useExportJob(exportId);
  if (!job.data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {job.data.type} · {exportId}
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
