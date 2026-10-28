
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { ConferenceSettingsService } from './conference-settings.service';
import { UpdateConferenceSettingsDto } from './dto/update-conference-settings.dto';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

interface UploadedTemplate {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MAX_TEMPLATE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TEMPLATE_TYPES = new Set([
  'image/png',
  'application/pdf',
]);

@Controller('conferences/:conferenceId/settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConferenceSettingsController {
  constructor(
    private readonly conferenceSettingsService: ConferenceSettingsService,
  ) {}

  @RequirePermissions(PERMISSIONS.CONFERENCE_READ)
  @Get()
  get(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.conferenceSettingsService.get(
      organizationId,
      conferenceId,
    );
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_UPDATE)
  @Put()
  upsert(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: UpdateConferenceSettingsDto,
  ) {
    return this.conferenceSettingsService.upsert(
      organizationId,
      conferenceId,
      dto,
    );
  }

  /**
   * Returns the saved certificate template for inline preview.
   */
  @RequirePermissions(PERMISSIONS.CONFERENCE_READ)
  @Get('certificate-template')
  async getCertificateTemplate(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Res() response: Response,
  ): Promise<void> {
    const template =
      await this.conferenceSettingsService.getCertificateTemplate(
        organizationId,
        conferenceId,
      );

    const safeFileName = template.fileName.replace(/["\\\r\n]/g, '_');

    response.setHeader('Content-Type', template.mimeType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${safeFileName}"`,
    );

    response.send(template.buffer);
  }

  /**
   * Uploads a PNG or PDF certificate template.
   */
  @RequirePermissions(PERMISSIONS.CONFERENCE_UPDATE)
  @Post('certificate-template')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_TEMPLATE_SIZE },
    }),
  )
  uploadCertificateTemplate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('conferenceId') conferenceId: string,
    @UploadedFile() file?: UploadedTemplate,
  ) {
    if (!file) {
      throw new BadRequestException(
        'PNG or PDF template file is required.',
      );
    }

    if (!ALLOWED_TEMPLATE_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only PNG and PDF templates are supported.',
      );
    }

    return this.conferenceSettingsService.uploadCertificateTemplate(
      organizationId,
      conferenceId,
      user.id,
      {
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
    );
  }
}
