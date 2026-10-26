'use client';

import { useQuery } from '@tanstack/react-query';

export function useFileDownloadUrl(fileId: string | null) {
  return useQuery({
    queryKey: ['files', fileId, 'download-path'],
    queryFn: async (): Promise<{ url: string }> => {
      if (!fileId) {
        throw new Error('File ID is required to download the file.');
      }

      return {
        url: `/api/proxy/files/${encodeURIComponent(fileId)}/download`,
      };
    },
    enabled: Boolean(fileId),
    staleTime: Infinity,
  });
}
