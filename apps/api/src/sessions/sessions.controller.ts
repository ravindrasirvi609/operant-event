import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { AssignSpeakersDto } from './dto/assign-speakers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  // Public: the stable, published schedule — no auth required.
  @Get('conferences/:conferenceId/program')
  findAllPublished(@Param('conferenceId') conferenceId: string) {
    return this.sessionsService.findAllPublished(conferenceId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROGRAM_MANAGE)
  @Get('conferences/:conferenceId/sessions')
  findAllForOrganizer(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.sessionsService.findAllForOrganizer(
      organizationId,
      conferenceId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROGRAM_MANAGE)
  @Post('conferences/:conferenceId/sessions')
  create(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessionsService.create(organizationId, conferenceId, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROGRAM_MANAGE)
  @Get('sessions/:id')
  findOneForOrganizer(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.findOneForOrganizer(organizationId, sessionId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROGRAM_MANAGE)
  @Patch('sessions/:id')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.update(organizationId, sessionId, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROGRAM_MANAGE)
  @Post('sessions/:id/publish')
  publish(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.publish(organizationId, sessionId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROGRAM_MANAGE)
  @Put('sessions/:id/speakers')
  assignSpeakers(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') sessionId: string,
    @Body() dto: AssignSpeakersDto,
  ) {
    return this.sessionsService.assignSpeakers(
      organizationId,
      sessionId,
      dto.assignments,
    );
  }
}
