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
import { PresentationsService } from './presentations.service';
import { AssignPresentationDto } from './dto/assign-presentation.dto';
import { UpdatePresentationDto } from './dto/update-presentation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.PROGRAM_MANAGE)
@Controller()
export class PresentationsController {
  constructor(private readonly presentationsService: PresentationsService) {}

  @Post('sessions/:sessionId/presentations')
  assign(
    @CurrentOrganizationId() organizationId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: AssignPresentationDto,
  ) {
    return this.presentationsService.assign(organizationId, sessionId, dto);
  }

  @Get('sessions/:sessionId/presentations')
  findAllForSession(
    @CurrentOrganizationId() organizationId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.presentationsService.findAllForSession(
      organizationId,
      sessionId,
    );
  }

  @Patch('presentations/:id')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') presentationId: string,
    @Body() dto: UpdatePresentationDto,
  ) {
    return this.presentationsService.update(
      organizationId,
      presentationId,
      dto,
    );
  }

  @Delete('presentations/:id')
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') presentationId: string,
  ) {
    return this.presentationsService.remove(organizationId, presentationId);
  }
}
