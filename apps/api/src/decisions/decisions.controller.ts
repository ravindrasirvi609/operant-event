import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { DecisionsService } from './decisions.service';
import { RecordDecisionDto } from './dto/record-decision.dto';
import { RequestRevisionDto } from './dto/request-revision.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller('abstracts/:abstractId')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.DECISION_RECORD)
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Post('decision')
  recordDecision(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('abstractId') abstractId: string,
    @Body() dto: RecordDecisionDto,
  ) {
    return this.decisionsService.recordDecision(
      organizationId,
      abstractId,
      user.id,
      dto,
    );
  }

  @Post('request-revision')
  requestRevision(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('abstractId') abstractId: string,
    @Body() dto: RequestRevisionDto,
  ) {
    return this.decisionsService.requestRevision(
      organizationId,
      abstractId,
      user.id,
      dto,
    );
  }
}
