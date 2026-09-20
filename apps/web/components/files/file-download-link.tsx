'use client';

/** Uses the same-origin authenticated download proxy so local `file://` storage URLs never reach the browser. */
export function FileDownloadLink({ fileId, label }: { fileId: string; label: string }) {
  return (
    <a href={`/api/proxy/files/${fileId}/download`} className="text-xs text-primary underline">
      {label}
    </a>
  );
}
