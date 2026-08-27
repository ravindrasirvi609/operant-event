export const JOB_STATUSES = ['QUEUED', 'RUNNING', 'DONE', 'FAILED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const EXPORT_TYPES = ['ABSTRACTS', 'REGISTRATIONS', 'PAYMENTS', 'AUDIT_LOG'] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

export const IMPORT_TYPES = ['AUTHORS', 'REVIEWERS', 'REGISTRATIONS'] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];

export interface ExportJob {
  id: string;
  organizationId: string;
  conferenceId: string | null;
  requestedBy: string;
  type: ExportType;
  status: JobStatus;
  resultFileId: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ImportJob {
  id: string;
  organizationId: string;
  conferenceId: string | null;
  requestedBy: string;
  type: ImportType;
  status: JobStatus;
  sourceFileId: string;
  errorReportFileId: string | null;
  rowsProcessed: number;
  rowsFailed: number;
  createdAt: string;
  completedAt: string | null;
}
