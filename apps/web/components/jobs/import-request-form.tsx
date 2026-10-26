
'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { JobStatusPoller } from '@/components/jobs/job-status-poller';
import { FileDownloadLink } from '@/components/files/file-download-link';
import {
  useCreateImport,
  useImportHistory,
  useImportJob,
} from '@/hooks/use-imports';
import { uploadFileToOrganization } from '@/lib/api/upload-file';
import { IMPORT_TYPES, type ImportType } from '@/lib/jobs/types';

export function ImportRequestForm({
  conferenceId,
}: {
  conferenceId: string;
}) {
  const [type, setType] = useState<ImportType>('AUTHORS');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createImport = useCreateImport(conferenceId);
  const historyQuery = useImportHistory(conferenceId);

  async function handleCreate() {
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const sourceFileId = await uploadFileToOrganization(file);

      await createImport.mutateAsync({
        type,
        sourceFileId,
      });

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create import.',
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="grid w-full min-w-0 grid-cols-1 items-center gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:gap-4">
        {/* Import type */}
        <div className="min-w-0">
          <Select
            value={type}
            onValueChange={(value) =>
              value && setType(value as ImportType)
            }
          >
            <SelectTrigger
              id="import-type"
              aria-label="Import type"
              className="h-11 w-full"
            >
              <SelectValue placeholder="Import type" />
            </SelectTrigger>

            <SelectContent>
              {IMPORT_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CSV file selector */}
        <div className="flex min-w-0 flex-col gap-1">
          <input
            ref={fileInputRef}
            id="import-csv-file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) =>
              setFile(event.target.files?.[0] ?? null)
            }
          />

          <div className="flex h-11 w-full min-w-0 items-center gap-3 rounded-lg border border-input bg-background px-3 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-full shrink-0 items-center gap-2 text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path d="M20 16.5v2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-2" />
              </svg>
              Choose file
            </button>

            <span
              className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
              title={file?.name ?? 'No file selected'}
            >
              {file ? file.name : 'No file selected'}
            </span>
          </div>

          <p className="text-xs leading-4 text-muted-foreground">
            CSV format only
            {file ? ` · ${(file.size / 1024).toFixed(1)} KB` : ''}
          </p>
        </div>

        {/* Request import */}
        <div className="min-w-0 sm:col-span-2 lg:col-span-1">
          <Button
            className="h-11 w-full whitespace-nowrap lg:w-auto"
            disabled={
              !file || uploading || createImport.isPending
            }
            onClick={handleCreate}
          >
            {uploading || createImport.isPending
              ? 'Uploading...'
              : 'Request import'}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Import history</h2>

        <AsyncBoundary
          query={historyQuery}
          empty={
            <p className="text-sm text-muted-foreground">
              No imports requested yet.
            </p>
          }
        >
          {(jobs) => (
            <ul className="space-y-3">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="rounded-lg border p-3"
                >
                  <ImportJobRow
                    importId={job.id}
                    type={job.type}
                    createdAt={job.createdAt}
                  />
                </li>
              ))}
            </ul>
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}

function ImportJobRow({
  importId,
  type,
  createdAt,
}: {
  importId: string;
  type: string;
  createdAt: string;
}) {
  const job = useImportJob(importId);

  if (!job.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading...
      </p>
    );
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
            Rows processed: {job.data.rowsProcessed} · Rows failed:{' '}
            {job.data.rowsFailed}
          </p>
        }
      />

      {job.data.errorReportFileId ? (
        <FileDownloadLink
          fileId={job.data.errorReportFileId}
          label="Download error report"
        />
      ) : null}
    </div>
  );
}