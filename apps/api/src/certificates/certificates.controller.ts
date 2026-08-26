import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  constructor(private readonly certificatesService: CertificatesService) {}

  // Public, SRS §18: minimum fields only, no auth.
  @Get('certificates/verify/:code')
  verifyByCode(@Param('code') code: string) {
    return this.certificatesService.verifyByCode(code);
  }

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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CERTIFICATE_MANAGE)
  @Post('certificates/:id/issue')
  issue(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') certificateId: string,
  ) {
    return this.certificatesService.issue(organizationId, certificateId);
  }

  // Registrant-facing: the caller's own certificate.
  @UseGuards(JwtAuthGuard)
  @Get('certificates/:id')
  findOwned(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') certificateId: string,
  ) {
    return this.certificatesService.findOwned(user.id, certificateId);
  }

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
