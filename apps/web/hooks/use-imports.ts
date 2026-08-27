'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import { useJobPolling } from '@/lib/jobs/use-job-polling';
import type { ImportJob, ImportType } from '@/lib/jobs/types';

function importHistoryQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'imports'];
}

export function useCreateImport(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, sourceFileId }: { type: ImportType; sourceFileId: string }) =>
      apiPost<ImportJob>(`conferences/${conferenceId}/imports`, { type, sourceFileId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importHistoryQueryKey(conferenceId) });
    },
  });
}

/** `GET conferences/:conferenceId/imports`, most recent first — the real backend history, not a per-session cache. */
export function useImportHistory(conferenceId: string) {
  return useQuery({
    queryKey: importHistoryQueryKey(conferenceId),
    queryFn: () => apiGet<ImportJob[]>(`conferences/${conferenceId}/imports`),
    enabled: Boolean(conferenceId),
  });
}

/** Same reality as exports (see use-exports.ts) — apps/worker consumes the `imports` queue. */
export function useImportJob(importId: string) {
  return useJobPolling<ImportJob>(['imports', importId], () => apiGet<ImportJob>(`imports/${importId}`), {
    intervalMs: 4000,
    terminalStatuses: ['DONE', 'FAILED'],
    maxAttempts: 30,
  });
}
