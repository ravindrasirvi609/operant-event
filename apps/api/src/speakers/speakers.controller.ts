import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SpeakersService } from './speakers.service';
import { CreateSpeakerDto } from './dto/create-speaker.dto';
import { UpdateSpeakerDto } from './dto/update-speaker.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.PROGRAM_MANAGE)
@Controller()
export class SpeakersController {
  constructor(private readonly speakersService: SpeakersService) {}

  @Post('conferences/:conferenceId/speakers')
  create(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateSpeakerDto,
  ) {
    return this.speakersService.create(organizationId, conferenceId, dto);
  }

  @Get('conferences/:conferenceId/speakers')
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.speakersService.findAll(organizationId, conferenceId);
  }

  @Patch('speakers/:id')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') speakerId: string,
    @Body() dto: UpdateSpeakerDto,
  ) {
    return this.speakersService.update(organizationId, speakerId, dto);
  }

  @Delete('speakers/:id')
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') speakerId: string,
  ) {
    return this.speakersService.remove(organizationId, speakerId);
  }
}
