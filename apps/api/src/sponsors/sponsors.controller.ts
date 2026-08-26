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
import { SponsorsService } from './sponsors.service';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.SPONSOR_MANAGE)
@Controller('conferences/:conferenceId/sponsors')
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateSponsorDto,
  ) {
    return this.sponsorsService.create(organizationId, conferenceId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.sponsorsService.findAll(organizationId, conferenceId);
  }

  @Patch(':id')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') sponsorId: string,
    @Body() dto: UpdateSponsorDto,
  ) {
    return this.sponsorsService.update(organizationId, sponsorId, dto);
  }

  @Delete(':id')
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') sponsorId: string,
  ) {
    return this.sponsorsService.remove(organizationId, sponsorId);
  }
}
