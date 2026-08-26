import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SpeakersService } from './speakers.service';
import { CreateSpeakerDto } from './dto/create-speaker.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.PROGRAM_MANAGE)
@Controller('conferences/:conferenceId/speakers')
export class SpeakersController {
  constructor(private readonly speakersService: SpeakersService) {}

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateSpeakerDto,
  ) {
    return this.speakersService.create(organizationId, conferenceId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.speakersService.findAll(organizationId, conferenceId);
  }
}
