
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  Res,
  StreamableFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import type { Response } from 'express';

// Maximum upload size: 5 MB
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
      },
    }),
  )
  upload(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedFile,
  ) {
    if (!file) {
      throw new NotFoundException(
        'No file was included in the request.',
      );
    }

    return this.filesService.upload(organizationId, user.id, {
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
  }

  @Get(':id/download-url')
  getDownloadUrl(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.filesService
      .getDownloadUrl(organizationId, id)
      .then((url) => ({ url }));
  }


  @Get(':id/preview')
  async preview(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { file, buffer } =
      await this.filesService.downloadForOrganization(
        organizationId,
        id,
      );

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.mimeType.toLowerCase())) {
      throw new NotFoundException('Image preview is not available.');
    }

    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-store');

    return new StreamableFile(buffer, {
      type: file.mimeType,
    });
  }


  @Get(':id/download')
  async download(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { file, buffer } =
      await this.filesService.downloadForOrganization(
        organizationId,
        id,
      );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );

    return new StreamableFile(buffer, {
      type: file.mimeType,
    });
  }
}

/**
 * Membership-free file upload/download path.
 *
 * Authors, reviewers, and registrants can use this path even when
 * they do not have an active organization membership.
 *
 * These routes require authentication but do not require an
 * organization membership.
 */
@Controller('files/self')
@UseGuards(JwtAuthGuard)
export class SelfServeFilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
      },
    }),
  )
  uploadSelf(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedFile,
  ) {
    if (!file) {
      throw new NotFoundException(
        'No file was included in the request.',
      );
    }

    return this.filesService.uploadSelf(user.id, {
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
  }

  @Get(':id/download-url')
  getDownloadUrlSelf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.filesService
      .getDownloadUrlSelf(user.id, id)
      .then((url) => ({ url }));
  }
}
