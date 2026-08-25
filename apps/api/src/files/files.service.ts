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
