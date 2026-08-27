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
import { ImportsService } from './imports.service';
import { CreateImportDto } from './dto/create-import.dto';
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
@RequirePermissions(PERMISSIONS.IMPORT_MANAGE)
@Controller()
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('conferences/:conferenceId/imports')
  @HttpCode(HttpStatus.ACCEPTED)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateImportDto,
  ) {
    return this.importsService.create(
      organizationId,
      conferenceId,
      user.id,
      dto.type,
      dto.sourceFileId,
    );
  }

  @Get('imports/:id')
  findById(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') importJobId: string,
  ) {
    return this.importsService.findById(organizationId, importJobId);
  }

  @Get('conferences/:conferenceId/imports')
  findAllForConference(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.importsService.findAllForConference(
      organizationId,
      conferenceId,
    );
  }
}
