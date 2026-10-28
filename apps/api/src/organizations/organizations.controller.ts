
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
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

import { AllowSuperAdmin } from '../common/decorators/allow-super-admin.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { CurrentEffectivePermissions } from '../common/decorators/current-effective-permissions.decorator';

import { PERMISSIONS } from '../common/permissions/permissions.catalogue';
import { assertMatchingOrganizationId } from '../common/utils/assert-matching-organization-id.util';

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  /**
   * Only a platform Super Admin may create an organization.
   */
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post()
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  /**
   * Returns organizations where the current user has an active membership.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findMine(user.id);
  }

  /**
   * Lists every organization for a platform Super Admin.
   */
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get()
  findAll() {
    return this.organizationsService.findAllForSuperAdmin();
  }

  /**
   * Activates or suspends an organization.
   */
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationStatusDto,
  ) {
    return this.organizationsService.updateStatus(id, dto.status);
  }

  /**
   * Updates organization details.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ORGANIZATION_UPDATE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    assertMatchingOrganizationId(id, organizationId);
    return this.organizationsService.update(organizationId, dto);
  }

  /**
   * Invites a member.
   * Super Admin access is explicitly allowed by PermissionsGuard.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @AllowSuperAdmin()
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS)
  @Post(':id/members')
  inviteMember(
    @Param('id') id: string,
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: InviteMemberDto,
  ) {
    assertMatchingOrganizationId(id, organizationId);
    return this.organizationsService.inviteMember(organizationId, dto);
  }

  /**
   * Updates a membership.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @AllowSuperAdmin()
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS)
  @Patch(':id/members/:membershipId')
  updateMembership(
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    assertMatchingOrganizationId(id, organizationId);
    return this.organizationsService.updateMembership(
      organizationId,
      membershipId,
      dto,
    );
  }

  /**
   * Lists members.
   * Active organization membership is required for regular users.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @AllowSuperAdmin()
  @Get(':id/members')
  listMembers(
    @Param('id') id: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    assertMatchingOrganizationId(id, organizationId);
    return this.organizationsService.listMembers(organizationId);
  }

  /**
   * Returns the current user's effective permissions.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id/me/permissions')
  myPermissions(
    @Param('id') id: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentEffectivePermissions() effectivePermissions: Set<string>,
  ) {
    assertMatchingOrganizationId(id, organizationId);
    return Array.from(effectivePermissions);
  }

  /**
   * Lists roles.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @AllowSuperAdmin()
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE_ROLES)
  @Get(':id/roles')
  listRoles(
    @Param('id') id: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    assertMatchingOrganizationId(id, organizationId);
    return this.organizationsService.listRoles(organizationId);
  }
}
