import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConferencesService } from './conferences.service';
import { CreateConferenceDto } from './dto/create-conference.dto';
import { UpdateConferenceDto } from './dto/update-conference.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller('conferences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConferencesController {
  constructor(private readonly conferencesService: ConferencesService) {}

  @RequirePermissions(PERMISSIONS.CONFERENCE_CREATE)
  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConferenceDto,
  ) {
    return this.conferencesService.create(organizationId, user.id, dto);
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_READ)
  @Get()
  findAll(@CurrentOrganizationId() organizationId: string) {
    return this.conferencesService.findAll(organizationId);
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_READ)
  @Get(':id')
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.conferencesService.findOne(organizationId, id);
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_UPDATE)
  @Patch(':id')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConferenceDto,
  ) {
    return this.conferencesService.update(organizationId, id, dto);
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_UPDATE)
  @Patch(':id/status')
  changeStatus(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.conferencesService.changeStatus(organizationId, id, dto.status);
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_UPDATE)
  @Post(':id/publish')
  publish(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.conferencesService.publish(organizationId, id);
  }
}
