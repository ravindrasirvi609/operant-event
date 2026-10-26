import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RegistrationTypesService } from './registration-types.service';
import { CreateRegistrationTypeDto } from './dto/create-registration-type.dto';
import { UpdateRegistrationTypeDto } from './dto/update-registration-type.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

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

  @Patch(':typeId')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('categoryId') categoryId: string,
    @Param('typeId') typeId: string,
    @Body() dto: UpdateRegistrationTypeDto,
  ) {
    return this.registrationTypesService.update(
      organizationId,
      categoryId,
      typeId,
      dto,
    );
  }
}
