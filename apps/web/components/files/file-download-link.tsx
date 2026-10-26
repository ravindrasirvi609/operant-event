
'use client';

type FileDownloadLinkProps =
  | {
      fileId: string;
      label: string;
      certificateId?: never;
    }
  | {
      certificateId: string;
      label: string;
      fileId?: never;
    };

export function FileDownloadLink(props: FileDownloadLinkProps) {
  const href =
    'certificateId' in props && props.certificateId
      ? `/api/proxy/certificates/${encodeURIComponent(
          props.certificateId,
        )}/download`
      : `/api/proxy/files/${encodeURIComponent(
          props.fileId!,
        )}/download`;

  return (
    <a
      href={href}
      className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium text-primary hover:bg-accent"
    >
      {props.label}
    </a>
  );
}
