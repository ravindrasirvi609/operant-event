import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from './storage-provider.interface';

export interface UploadFileInput {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async upload(
    organizationId: string,
    uploadedBy: string,
    input: UploadFileInput,
  ) {
    const key = `${organizationId}/${randomUUID()}-${input.fileName}`;
    const { bucket, storageKey } = await this.storage.upload({
      key,
      buffer: input.buffer,
      mimeType: input.mimeType,
    });

    return this.prisma.file.create({
      data: {
        organizationId,
        fileName: input.fileName,
        storageKey,
        mimeType: input.mimeType,
        size: input.size,
        bucket,
        uploadedBy,
      },
    });
  }

  /**
   * Membership-free upload: for callers with no organization context at
   * all (abstract authors, reviewers, registrants) who still need to
   * attach a file. Storage-key-namespaced by user id instead of
   * organization id, and `organizationId: null` on the row — never mixed
   * with the org-scoped `upload`/`getDownloadUrl` above.
   */
  async uploadSelf(uploadedBy: string, input: UploadFileInput) {
    const key = `users/${uploadedBy}/${randomUUID()}-${input.fileName}`;
    const { bucket, storageKey } = await this.storage.upload({
      key,
      buffer: input.buffer,
      mimeType: input.mimeType,
    });

    return this.prisma.file.create({
      data: {
        organizationId: null,
        fileName: input.fileName,
        storageKey,
        mimeType: input.mimeType,
        size: input.size,
        bucket,
        uploadedBy,
      },
    });
  }

  async getDownloadUrlSelf(
    uploadedBy: string,
    fileId: string,
  ): Promise<string> {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, uploadedBy, organizationId: null },
    });
    if (!file) {
      throw new NotFoundException('File not found.');
    }
    return this.storage.getDownloadUrl(file.storageKey);
  }

  async getDownloadUrl(
    organizationId: string,
    fileId: string,
  ): Promise<string> {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, organizationId },
    });
    if (!file) {
      throw new NotFoundException('File not found.');
    }
    return this.storage.getDownloadUrl(file.storageKey);
  }
}
