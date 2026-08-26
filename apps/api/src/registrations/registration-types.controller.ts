import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { RegistrationTypesService } from './registration-types.service';
import { CreateRegistrationTypeDto } from './dto/create-registration-type.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

// Organizer-facing: pricing-window setup for a registration category.
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.REGISTRATION_MANAGE)
@Controller('registration-categories/:categoryId/types')
export class RegistrationTypesController {
  constructor(
    private readonly registrationTypesService: RegistrationTypesService,
  ) {}

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateRegistrationTypeDto,
  ) {
    return this.registrationTypesService.create(
      organizationId,
      categoryId,
      dto,
    );
  }
}
