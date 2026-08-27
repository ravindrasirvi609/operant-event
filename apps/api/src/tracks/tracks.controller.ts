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
import { TracksService } from './tracks.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { ReorderTracksDto } from './dto/reorder-tracks.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller('conferences/:conferenceId/tracks-for-submission')
@UseGuards(JwtAuthGuard)
export class SubmissionTracksController {
  constructor(private readonly tracksService: TracksService) {}

  /** No org context — an author filling out a submission has no organization membership. */
  @Get()
  findPublishedForSubmission(@Param('conferenceId') conferenceId: string) {
    return this.tracksService.findPublishedForSubmission(conferenceId);
  }
}

@Controller('conferences/:conferenceId/tracks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @RequirePermissions(PERMISSIONS.CONFERENCE_READ)
  @Get()
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.tracksService.findAll(organizationId, conferenceId);
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_UPDATE)
  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateTrackDto,
  ) {
    return this.tracksService.create(organizationId, conferenceId, dto);
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_UPDATE)
  @Patch(':trackId')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Param('trackId') trackId: string,
    @Body() dto: UpdateTrackDto,
  ) {
    return this.tracksService.update(
      organizationId,
      conferenceId,
      trackId,
      dto,
    );
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_UPDATE)
  @Put('reorder')
  reorder(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: ReorderTracksDto,
  ) {
    return this.tracksService.reorder(
      organizationId,
      conferenceId,
      dto.trackIds,
    );
  }
}
