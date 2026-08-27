'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobStatusPoller } from '@/components/jobs/job-status-poller';
import { useFileDownloadUrl } from '@/hooks/use-files';
import { useCreateImport, useImportJob } from '@/hooks/use-imports';
import { uploadFileToOrganization } from '@/lib/api/upload-file';
import { addJobToHistory } from '@/lib/jobs/job-history-cache';
import { useJobHistory } from '@/lib/jobs/use-job-history';
import { IMPORT_TYPES, type ImportType } from '@/lib/jobs/types';

/** Same session-local "history" caveat as exports — see export-request-form.tsx. */
export function ImportRequestForm({ conferenceId }: { conferenceId: string }) {
  const [type, setType] = useState<ImportType>('AUTHORS');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const createImport = useCreateImport(conferenceId);
  const [error, setError] = useState<string | null>(null);
  const history = useJobHistory('imports', conferenceId);
  const [localHistory, setLocalHistory] = useState<string[]>(history);

  async function handleCreate() {
    if (!file) {
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const sourceFileId = await uploadFileToOrganization(file);
      const job = await createImport.mutateAsync({ type, sourceFileId });
      addJobToHistory('imports', conferenceId, job.id);
      setLocalHistory((current) => [job.id, ...current]);
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
        <h2 className="text-sm font-semibold">This session&apos;s requests</h2>
        {localHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No imports requested yet this session.</p>
        ) : (
          <ul className="space-y-3">
            {localHistory.map((jobId) => (
              <li key={jobId} className="rounded-lg border p-3">
                <ImportJobRow importId={jobId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ImportJobRow({ importId }: { importId: string }) {
  const job = useImportJob(importId);
  if (!job.data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {job.data.type} · {importId}
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
      {job.data.errorReportFileId ? <ErrorReportLink fileId={job.data.errorReportFileId} /> : null}
    </div>
  );
}

function ErrorReportLink({ fileId }: { fileId: string }) {
  const downloadUrlQuery = useFileDownloadUrl(fileId);
  if (!downloadUrlQuery.data) {
    return <p className="text-xs text-muted-foreground">Preparing error report link…</p>;
  }
  return (
    <a href={downloadUrlQuery.data.url} className="text-xs text-primary underline">
      Download error report
    </a>
  );
}
