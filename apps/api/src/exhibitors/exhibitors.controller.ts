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
import { ExhibitorsService } from './exhibitors.service';
import { CreateExhibitorDto } from './dto/create-exhibitor.dto';
import { UpdateExhibitorDto } from './dto/update-exhibitor.dto';
import { AddExhibitorStaffDto } from './dto/add-exhibitor-staff.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.EXHIBITOR_MANAGE)
@Controller()
export class ExhibitorsController {
  constructor(private readonly exhibitorsService: ExhibitorsService) {}

  @Post('conferences/:conferenceId/exhibitors')
  create(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateExhibitorDto,
  ) {
    return this.exhibitorsService.create(organizationId, conferenceId, dto);
  }

  @Get('conferences/:conferenceId/exhibitors')
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.exhibitorsService.findAll(organizationId, conferenceId);
  }

  @Patch('exhibitors/:id')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') exhibitorId: string,
    @Body() dto: UpdateExhibitorDto,
  ) {
    return this.exhibitorsService.update(organizationId, exhibitorId, dto);
  }

  @Post('exhibitors/:id/staff')
  addStaff(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') exhibitorId: string,
    @Body() dto: AddExhibitorStaffDto,
  ) {
    return this.exhibitorsService.addStaff(organizationId, exhibitorId, dto);
  }

  @Delete('exhibitor-staff/:staffId')
  removeStaff(
    @CurrentOrganizationId() organizationId: string,
    @Param('staffId') staffId: string,
  ) {
    return this.exhibitorsService.removeStaff(organizationId, staffId);
  }
}
