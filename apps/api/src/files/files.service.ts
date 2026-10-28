
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '@operant-event/storage';

export interface UploadFileInput {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const PAYMENT_PROOF_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
  ) {}

  /**
   * Verifies that a file belongs to the specified user
   * and is not an organization-owned file.
   */
  async assertSelfOwnedFile(
    fileId: string,
    uploadedBy: string,
  ): Promise<void> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        uploadedBy,
        organizationId: null,
      },
      select: {
        id: true,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found.');
    }
  }

  /**
   * Validates upload metadata and enforces the 5 MB limit.
   */
  private validateUpload(input: UploadFileInput): void {
    if (!input.buffer || input.buffer.length === 0) {
      throw new BadRequestException('The uploaded file is empty.');
    }

    if (
      !Number.isSafeInteger(input.size) ||
      input.size <= 0 ||
      input.size > MAX_FILE_SIZE_BYTES ||
      input.buffer.length > MAX_FILE_SIZE_BYTES
    ) {
      throw new BadRequestException(
        'File size must be greater than 0 and must not exceed 5 MB.',
      );
    }

    if (
      !input.fileName ||
      input.fileName.includes('/') ||
      input.fileName.includes('\\') ||
      input.fileName.includes('\0')
    ) {
      throw new BadRequestException('Invalid file name.');
    }

    if (!input.mimeType || !input.mimeType.trim()) {
      throw new BadRequestException('File MIME type is required.');
    }
  }

  /**
   * Checks ownership, MIME metadata and stored size before
   * allowing a self-serve file to be used as payment proof.
   */
  async assertValidPaymentProof(
    fileId: string,
    uploadedBy: string,
  ): Promise<void> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        uploadedBy,
        organizationId: null,
      },
      select: {
        id: true,
        mimeType: true,
        size: true,
        fileName: true,
      },
    });

    if (!file) {
      throw new NotFoundException('Payment proof file not found.');
    }

    if (
      !PAYMENT_PROOF_MIME_TYPES.has(file.mimeType.toLowerCase())
    ) {
      throw new BadRequestException(
        'Payment proof must be a PDF, JPG, JPEG, or PNG file.',
      );
    }

    if (
      !Number.isSafeInteger(file.size) ||
      file.size <= 0 ||
      file.size > MAX_FILE_SIZE_BYTES
    ) {
      throw new BadRequestException(
        'Payment proof size must be greater than 0 and must not exceed 5 MB.',
      );
    }
  }

  /**
   * Downloads a payment proof only when it belongs to the specified user.
   */
  async downloadPaymentProof(
    fileId: string,
    uploadedBy: string,
  ) {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        organizationId: null,
        uploadedBy,
      },
    });

    if (!file) {
      throw new NotFoundException('Payment proof file not found.');
    }

    const buffer = await this.storage.download(file.storageKey);

    return { file, buffer };
  }

  /**
   * Uploads a file for an organization.
   */
  async upload(
    organizationId: string,
    uploadedBy: string,
    input: UploadFileInput,
  ) {
    this.validateUpload(input);

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
   * Uploads a file for a user without requiring organization membership.
   */
  async uploadSelf(
    uploadedBy: string,
    input: UploadFileInput,
  ) {
    this.validateUpload(input);

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

  /**
   * Gets a download URL only for a self-serve file uploaded by the user.
   */
  async getDownloadUrlSelf(
    uploadedBy: string,
    fileId: string,
  ): Promise<string> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        uploadedBy,
        organizationId: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found.');
    }

    return this.storage.getDownloadUrl(file.storageKey);
  }

  /**
   * Gets a download URL for a file belonging to an organization.
   */
  async getDownloadUrl(
    organizationId: string,
    fileId: string,
  ): Promise<string> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        organizationId,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found.');
    }

    return this.storage.getDownloadUrl(file.storageKey);
  }

  /**
   * Downloads a file belonging to the specified organization.
   */
  async downloadForOrganization(
    organizationId: string,
    fileId: string,
  ) {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        organizationId,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found.');
    }

    const buffer = await this.storage.download(file.storageKey);

    return { file, buffer };
  }
}
