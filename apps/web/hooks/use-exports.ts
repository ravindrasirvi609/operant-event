'use client';

import { useMutation } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import { useJobPolling } from '@/lib/jobs/use-job-polling';
import type { ExportJob, ExportType } from '@/lib/jobs/types';

/** 202 Accepted — returns the job row immediately at status QUEUED, never blocks on the job actually running. */
export function useCreateExport(conferenceId: string) {
  return useMutation({
    mutationFn: (type: ExportType) => apiPost<ExportJob>(`conferences/${conferenceId}/exports`, { type }),
  });
}

/**
 * Polls `GET exports/:id` until DONE/FAILED. Note: as of this phase, no
 * worker process consumes the export BullMQ queue at all — a real job
 * is enqueued, but nothing transitions it past QUEUED. This poller is
 * still the correct, real pattern to have in place; it will simply
 * never observe a terminal state until the worker exists. The UI must
 * say so plainly rather than implying the export is "in progress."
 */
export function useExportJob(exportId: string) {
  return useJobPolling<ExportJob>(['exports', exportId], () => apiGet<ExportJob>(`exports/${exportId}`), {
    intervalMs: 4000,
    terminalStatuses: ['DONE', 'FAILED'],
    maxAttempts: 30,
  });
}
