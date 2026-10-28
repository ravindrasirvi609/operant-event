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


/**
 * Public/authenticated conference discovery and
 * organization-scoped conference management.
 */
@Controller('conferences')
export class ConferencesController {
  constructor(
    private readonly conferencesService: ConferencesService,
  ) {}


  /**
   * Author submission conference list.
   *
   * IMPORTANT:
   * This route only requires authentication.
   *
   * Authors do NOT need organization membership
   * to discover conferences accepting submissions.
   */
  @Get('for-submission')
  @UseGuards(JwtAuthGuard)
  findOpenForSubmission() {
    return this.conferencesService.findOpenForSubmission();
  }


  /**
   * Organization admin conference creation.
   */
  @Post()
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.CONFERENCE_CREATE,
  )
  create(
    @CurrentOrganizationId()
    organizationId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    dto: CreateConferenceDto,
  ) {
    return this.conferencesService.create(
      organizationId,
      user.id,
      dto,
    );
  }


  /**
   * Organization admin conference list.
   */
  @Get()
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.CONFERENCE_READ,
  )
  findAll(
    @CurrentOrganizationId()
    organizationId: string,
  ) {
    return this.conferencesService.findAll(
      organizationId,
    );
  }


  /**
   * Organization admin conference details.
   */
  @Get(':id')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.CONFERENCE_READ,
  )
  findOne(
    @CurrentOrganizationId()
    organizationId: string,

    @Param('id')
    id: string,
  ) {
    return this.conferencesService.findOne(
      organizationId,
      id,
    );
  }


  /**
   * Organization admin conference update.
   */
  @Patch(':id')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.CONFERENCE_UPDATE,
  )
  update(
    @CurrentOrganizationId()
    organizationId: string,

    @Param('id')
    id: string,

    @Body()
    dto: UpdateConferenceDto,
  ) {
    return this.conferencesService.update(
      organizationId,
      id,
      dto,
    );
  }


  /**
   * Change conference lifecycle status.
   */
  @Patch(':id/status')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.CONFERENCE_UPDATE,
  )
  changeStatus(
    @CurrentOrganizationId()
    organizationId: string,

    @Param('id')
    id: string,

    @Body()
    dto: ChangeStatusDto,
  ) {
    return this.conferencesService.changeStatus(
      organizationId,
      id,
      dto.status,
    );
  }


  /**
   * Publish conference.
   *
   * The service validates publish readiness and
   * moves the conference to OPEN.
   */
  @Post(':id/publish')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.CONFERENCE_UPDATE,
  )
  publish(
    @CurrentOrganizationId()
    organizationId: string,

    @Param('id')
    id: string,
  ) {
    return this.conferencesService.publish(
      organizationId,
      id,
    );
  }
}