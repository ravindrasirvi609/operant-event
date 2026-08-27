import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
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

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('No file was included in the request.');
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
}

/**
 * Membership-free path: authors, reviewers, and registrants with no
 * organization membership still need to attach a file. A separate
 * controller class — not a method-level guard override on
 * `FilesController` — because NestJS composes class-level and
 * method-level `@UseGuards` rather than letting a method opt out of a
 * class-level guard; `PermissionsGuard` (and its mandatory
 * `X-Organization-Id` header) must never run on these two routes.
 */
@Controller('files/self')
@UseGuards(JwtAuthGuard)
export class SelfServeFilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadSelf(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('No file was included in the request.');
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
