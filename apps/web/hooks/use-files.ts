'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';

/** Org-scoped download-url endpoint — appropriate here since export/import results are always organizer-facing. */
export function useFileDownloadUrl(fileId: string | null) {
  return useQuery({
    queryKey: ['files', fileId, 'download-url'],
    queryFn: () => apiGet<{ url: string }>(`files/${fileId}/download-url`),
    enabled: Boolean(fileId),
  });
}
