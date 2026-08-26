import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.REPORT_VIEW)
@Controller('conferences/:conferenceId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':dashboard')
  getDashboard(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Param('dashboard') dashboard: string,
  ) {
    return this.reportsService.getDashboard(
      organizationId,
      conferenceId,
      dashboard,
    );
  }
}
