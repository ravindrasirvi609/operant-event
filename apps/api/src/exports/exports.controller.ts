import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ExportsService } from './exports.service';
import { CreateExportDto } from './dto/create-export.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.EXPORT_MANAGE)
@Controller()
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('conferences/:conferenceId/exports')
  @HttpCode(HttpStatus.ACCEPTED)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateExportDto,
  ) {
    return this.exportsService.create(
      organizationId,
      conferenceId,
      user.id,
      dto.type,
    );
  }

  @Get('exports/:id')
  findById(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') exportJobId: string,
  ) {
    return this.exportsService.findById(organizationId, exportJobId);
  }

  @Get('conferences/:conferenceId/exports')
  findAllForConference(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.exportsService.findAllForConference(
      organizationId,
      conferenceId,
    );
  }
}
