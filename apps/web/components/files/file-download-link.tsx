'use client';

import { useFileDownloadUrl } from '@/hooks/use-files';

/** Resolves `fileId` to a real download URL and renders it as a link — shared by any view that shows a generated PDF (certificate, invoice, job result). */
export function FileDownloadLink({ fileId, label }: { fileId: string; label: string }) {
  const downloadUrlQuery = useFileDownloadUrl(fileId);
  if (!downloadUrlQuery.data) {
    return <p className="text-xs text-muted-foreground">Preparing download link…</p>;
  }
  return (
    <a href={downloadUrlQuery.data.url} className="text-xs text-primary underline">
      {label}
    </a>
  );
}
