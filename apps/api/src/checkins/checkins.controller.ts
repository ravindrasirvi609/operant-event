import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CheckinsService } from './checkins.service';
import { CheckinDto } from './dto/checkin.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

// Event-day staff facing. SRS §35: "large touch targets, fast search" —
// the single POST body accepts a qrCode or a manual-search fallback
// (registrationNumber/email) so the frontend can offer both in one flow.
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CHECKIN_MANAGE)
@Controller()
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  @Post('checkins')
  checkin(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CheckinDto,
  ) {
    return this.checkinsService.checkin(organizationId, dto);
  }

  @Get('conferences/:conferenceId/checkins')
  findAllForConference(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.checkinsService.findAllForConference(
      organizationId,
      conferenceId,
    );
  }
}
