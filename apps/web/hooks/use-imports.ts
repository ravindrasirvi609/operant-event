'use client';

import { useMutation } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import { useJobPolling } from '@/lib/jobs/use-job-polling';
import type { ImportJob, ImportType } from '@/lib/jobs/types';

export function useCreateImport(conferenceId: string) {
  return useMutation({
    mutationFn: ({ type, sourceFileId }: { type: ImportType; sourceFileId: string }) =>
      apiPost<ImportJob>(`conferences/${conferenceId}/imports`, { type, sourceFileId }),
  });
}

/** Same reality as exports (see use-exports.ts) — a real BullMQ job is enqueued, but nothing currently consumes that queue. */
export function useImportJob(importId: string) {
  return useJobPolling<ImportJob>(['imports', importId], () => apiGet<ImportJob>(`imports/${importId}`), {
    intervalMs: 4000,
    terminalStatuses: ['DONE', 'FAILED'],
    maxAttempts: 30,
  });
}
