export interface UploadInput {
  key: string;
  buffer: Buffer;
  mimeType: string;
}

export interface UploadResult {
  bucket: string;
  storageKey: string;
}

/**
 * Provider abstraction (SRS §5, §21) — domain code never imports an S3/R2
 * SDK directly. STORAGE_PROVIDER is bound to LocalDiskStorageProvider for
 * now; swap the binding once the S3-vs-R2 open decision (SRS §42.3) is
 * made, and nothing in FilesService changes.
 */
export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  getDownloadUrl(storageKey: string): Promise<string>;
  /** Reads the file's raw bytes back — needed by any consumer that must process a previously-uploaded file itself (e.g. parsing an import's source CSV), not just hand the caller a URL. */
  download(storageKey: string): Promise<Buffer>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
