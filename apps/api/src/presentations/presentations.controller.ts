import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { PresentationsService } from './presentations.service';
import { AssignPresentationDto } from './dto/assign-presentation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.PROGRAM_MANAGE)
@Controller('sessions/:sessionId/presentations')
export class PresentationsController {
  constructor(private readonly presentationsService: PresentationsService) {}

  @Post()
  assign(
    @CurrentOrganizationId() organizationId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: AssignPresentationDto,
  ) {
    return this.presentationsService.assign(organizationId, sessionId, dto);
  }
}
