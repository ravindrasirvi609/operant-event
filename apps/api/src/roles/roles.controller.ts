import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller('organizations/:organizationId/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE_ROLES)
  @Post()
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.createRole(organizationId, dto);
  }
}
