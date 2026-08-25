import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ConferenceSettingsService } from './conference-settings.service';
import { UpdateConferenceSettingsDto } from './dto/update-conference-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

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
    return this.conferenceSettingsService.get(organizationId, conferenceId);
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
}
