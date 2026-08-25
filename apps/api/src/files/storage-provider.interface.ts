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
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
