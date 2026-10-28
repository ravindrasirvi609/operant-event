
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesService } from '../files/files.service';
import { SponsorsService } from './sponsors.service';

@Controller('conferences/:conferenceId')
export class PublicSponsorsController {
  constructor(
    private readonly sponsorsService: SponsorsService,
    private readonly filesService: FilesService,
  ) {}

  @Get('public-sponsors')
  findPublicSponsors(
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.sponsorsService.findPublicSponsors(conferenceId);
  }

  @Get('public-sponsors/:fileId/logo')
  async getPublicSponsorLogo(
    @Param('conferenceId') conferenceId: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const organizationId =
      await this.sponsorsService.getPublicSponsorLogo(
        conferenceId,
        fileId,
      );

    const { file, buffer } =
      await this.filesService.downloadForOrganization(
        organizationId,
        fileId,
      );

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimeType.toLowerCase())) {
      throw new NotFoundException('Sponsor logo not found.');
    }

    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'public, max-age=300');

    return new StreamableFile(buffer, {
      type: file.mimeType,
    });
  }
}
