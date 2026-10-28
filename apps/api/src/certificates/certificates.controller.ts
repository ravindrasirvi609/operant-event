
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';

import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller()
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
  ) {}

  // Public certificate verification
  @Get('certificates/verify/:code')
  verifyByCode(@Param('code') code: string) {
    return this.certificatesService.verifyByCode(code);
  }

  // Download a certificate owned by the logged-in participant.
  // The service checks whether feedback has been submitted first.
  @UseGuards(JwtAuthGuard)
  @Get('certificates/:id/download')
  async downloadOwnedCertificate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') certificateId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { file, buffer } =
      await this.certificatesService.downloadOwnedCertificate(
        user.id,
        certificateId,
      );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );

    return new StreamableFile(buffer, {
      type: file.mimeType || 'application/pdf',
    });
  }

  // List certificates for the logged-in participant
  @UseGuards(JwtAuthGuard)
  @Get('certificates/mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.certificatesService.findMine(user.id);
  }

  // Get the logged-in participant's feedback for a conference.
  // Returns the feedback record or null if feedback has not been submitted.
  @UseGuards(JwtAuthGuard)
  @Get('conferences/:conferenceId/feedback/mine')
  getMyConferenceFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.certificatesService.getMyConferenceFeedback(
      user.id,
      conferenceId,
    );
  }

  // Submit conference feedback before downloading certificates
  @UseGuards(JwtAuthGuard)
  @Post('conferences/:conferenceId/feedback')
  submitConferenceFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conferenceId') conferenceId: string,
    @Body()
    body: {
      rating: number;
      contentRating: string;
      comments?: string;
    },
  ) {
    return this.certificatesService.submitConferenceFeedback(
      user.id,
      conferenceId,
      body,
    );
  }

  // List certificates for an organization's conference
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CERTIFICATE_MANAGE)
  @Get('conferences/:conferenceId/certificates')
  findAllForConference(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.certificatesService.findAllForConference(
      organizationId,
      conferenceId,
    );
  }

  // Generate eligible certificates
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CERTIFICATE_MANAGE)
  @Post('conferences/:conferenceId/certificates/generate')
  generateForConference(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.certificatesService.generateForConference(
      organizationId,
      conferenceId,
    );
  }

  // Issue a certificate
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CERTIFICATE_MANAGE)
  @Post('certificates/:id/issue')
  issue(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') certificateId: string,
  ) {
    return this.certificatesService.issue(
      organizationId,
      certificateId,
    );
  }

  // Regenerate an issued certificate using the latest uploaded template
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CERTIFICATE_MANAGE)
  @Post('certificates/:id/regenerate-pdf')
  regeneratePdf(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') certificateId: string,
  ) {
    return this.certificatesService.regenerateIssuedCertificatePdf(
      organizationId,
      certificateId,
    );
  }

  // Revoke a certificate
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CERTIFICATE_MANAGE)
  @Post('certificates/:id/revoke')
  revoke(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') certificateId: string,
  ) {
    return this.certificatesService.revoke(
      organizationId,
      certificateId,
    );
  }

  // Get one certificate owned by the logged-in participant
  @UseGuards(JwtAuthGuard)
  @Get('certificates/:id')
  findOwned(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') certificateId: string,
  ) {
    return this.certificatesService.findOwned(
      user.id,
      certificateId,
    );
  }

  // Get a certificate for an authorized organizer
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CERTIFICATE_MANAGE)
  @Get('certificates/:id/organizer')
  findForOrganizer(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') certificateId: string,
  ) {
    return this.certificatesService.findForOrganizer(
      organizationId,
      certificateId,
    );
  }
}
