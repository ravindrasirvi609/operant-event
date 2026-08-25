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
