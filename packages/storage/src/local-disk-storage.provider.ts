import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { StorageProvider, UploadInput, UploadResult } from './storage-provider.interface';

/**
 * Dev-only stopgap: writes to a local disk directory. Replace once
 * S3-vs-R2 (SRS §42.3) is decided.
 *
 * `baseDir` is passed in explicitly (from the shared `UPLOADS_DIR` env
 * var) rather than derived from `process.cwd()` — apps/api and
 * apps/worker are separate processes that may be launched from
 * different working directories, and a file written by one is read
 * back by the other (an import's source file, an export's result
 * file), so both must resolve to the exact same absolute directory.
 */
export class LocalDiskStorageProvider implements StorageProvider {
  constructor(private readonly baseDir: string) {}

  async upload(input: UploadInput): Promise<UploadResult> {
    const destination = join(this.baseDir, input.key);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, input.buffer);
    return { bucket: 'local', storageKey: input.key };
  }

  getDownloadUrl(storageKey: string): Promise<string> {
    return Promise.resolve(`file://${join(this.baseDir, storageKey)}`);
  }

  download(storageKey: string): Promise<Buffer> {
    return readFile(join(this.baseDir, storageKey));
  }
}
