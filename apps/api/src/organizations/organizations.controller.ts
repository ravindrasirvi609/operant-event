import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findMine(user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ORGANIZATION_UPDATE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS)
  @Post(':id/members')
  inviteMember(@Param('id') id: string, @Body() dto: InviteMemberDto) {
    return this.organizationsService.inviteMember(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS)
  @Patch(':id/members/:membershipId')
  updateMembership(
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.organizationsService.updateMembership(id, membershipId, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE_ROLES)
  @Get(':id/roles')
  listRoles(@Param('id') id: string) {
    return this.organizationsService.listRoles(id);
  }
}
