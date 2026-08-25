import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import type {
  StorageProvider,
  UploadInput,
  UploadResult,
} from './storage-provider.interface';

/** Dev-only stopgap: writes to ./uploads on local disk. Replace once S3-vs-R2 (SRS §42.3) is decided. */
@Injectable()
export class LocalDiskStorageProvider implements StorageProvider {
  private readonly baseDir = join(process.cwd(), 'uploads');

  async upload(input: UploadInput): Promise<UploadResult> {
    const destination = join(this.baseDir, input.key);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, input.buffer);
    return { bucket: 'local', storageKey: input.key };
  }

  getDownloadUrl(storageKey: string): Promise<string> {
    return Promise.resolve(`file://${join(this.baseDir, storageKey)}`);
  }
}
