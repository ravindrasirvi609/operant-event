'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { JobStatusPoller } from '@/components/jobs/job-status-poller';
import { FileDownloadLink } from '@/components/files/file-download-link';
import { useCreateImport, useImportHistory, useImportJob } from '@/hooks/use-imports';
import { uploadFileToOrganization } from '@/lib/api/upload-file';
import { IMPORT_TYPES, type ImportType } from '@/lib/jobs/types';

/** Import history is the real `GET conferences/:conferenceId/imports` list — visible across tabs/devices/sessions, not a session-local cache. */
export function ImportRequestForm({ conferenceId }: { conferenceId: string }) {
  const [type, setType] = useState<ImportType>('AUTHORS');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const createImport = useCreateImport(conferenceId);
  const historyQuery = useImportHistory(conferenceId);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!file) {
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const sourceFileId = await uploadFileToOrganization(file);
      await createImport.mutateAsync({ type, sourceFileId });
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create import.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Select value={type} onValueChange={(value) => value && setType(value as ImportType)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMPORT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="file"
          className="text-sm"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Button disabled={!file || uploading || createImport.isPending} onClick={handleCreate}>
          {uploading || createImport.isPending ? 'Uploading…' : 'Request import'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Import history</h2>
        <AsyncBoundary query={historyQuery} empty={<p className="text-sm text-muted-foreground">No imports requested yet.</p>}>
          {(jobs) => (
            <ul className="space-y-3">
              {jobs.map((job) => (
                <li key={job.id} className="rounded-lg border p-3">
                  <ImportJobRow importId={job.id} type={job.type} createdAt={job.createdAt} />
                </li>
              ))}
            </ul>
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}

function ImportJobRow({ importId, type, createdAt }: { importId: string; type: string; createdAt: string }) {
  const job = useImportJob(importId);
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
        error={null}
        resultFileId={null}
        exceededMaxAttempts={job.exceededMaxAttempts}
        extra={
          <p className="text-xs text-muted-foreground">
            Rows processed: {job.data.rowsProcessed} · Rows failed: {job.data.rowsFailed}
          </p>
        }
      />
      {job.data.errorReportFileId ? (
        <FileDownloadLink fileId={job.data.errorReportFileId} label="Download error report" />
      ) : null}
    </div>
  );
}
