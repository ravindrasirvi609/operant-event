'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import { useJobPolling } from '@/lib/jobs/use-job-polling';
import type { ExportJob, ExportType } from '@/lib/jobs/types';

function exportHistoryQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'exports'];
}

/** 202 Accepted — returns the job row immediately at status QUEUED, never blocks on the job actually running. apps/worker picks it up from the `exports` BullMQ queue. */
export function useCreateExport(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (type: ExportType) => apiPost<ExportJob>(`conferences/${conferenceId}/exports`, { type }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exportHistoryQueryKey(conferenceId) });
    },
  });
}

/** `GET conferences/:conferenceId/exports`, most recent first — the real backend history, not a per-session cache. */
export function useExportHistory(conferenceId: string) {
  return useQuery({
    queryKey: exportHistoryQueryKey(conferenceId),
    queryFn: () => apiGet<ExportJob[]>(`conferences/${conferenceId}/exports`),
    enabled: Boolean(conferenceId),
  });
}

/** Polls `GET exports/:id` until DONE/FAILED — apps/worker consumes the `exports` queue and moves it through RUNNING to a terminal status. */
export function useExportJob(exportId: string) {
  return useJobPolling<ExportJob>(['exports', exportId], () => apiGet<ExportJob>(`exports/${exportId}`), {
    intervalMs: 4000,
    terminalStatuses: ['DONE', 'FAILED'],
    maxAttempts: 30,
  });
}
