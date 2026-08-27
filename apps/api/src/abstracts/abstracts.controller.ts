import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AbstractsService } from './abstracts.service';
import { CreateAbstractDto } from './dto/create-abstract.dto';
import { SaveVersionDto } from './dto/save-version.dto';
import { SetAuthorsDto } from './dto/set-authors.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

// Author-facing: any authenticated user acting on their own submissions.
// There is no organization context here — an author is not necessarily a
// member of the organization running the conference they're submitting to.
@Controller()
export class AbstractsController {
  constructor(private readonly abstractsService: AbstractsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('conferences/:conferenceId/abstracts')
  createDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateAbstractDto,
  ) {
    return this.abstractsService.createDraft(conferenceId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('abstracts/mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.abstractsService.findMine(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('abstracts/:id')
  findOwned(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') abstractId: string,
  ) {
    return this.abstractsService.findOwnedWithDetail(user.id, abstractId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('abstracts/:id/versions')
  saveVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') abstractId: string,
    @Body() dto: SaveVersionDto,
  ) {
    return this.abstractsService.saveVersion(user.id, abstractId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('abstracts/:id/submit')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') abstractId: string,
  ) {
    return this.abstractsService.submit(user.id, abstractId, false);
  }

  @UseGuards(JwtAuthGuard)
  @Post('abstracts/:id/withdraw')
  withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') abstractId: string,
  ) {
    return this.abstractsService.withdraw(user.id, abstractId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('abstracts/:id/authors')
  setAuthors(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') abstractId: string,
    @Body() dto: SetAuthorsDto,
  ) {
    return this.abstractsService.setAuthors(user.id, abstractId, dto.authors);
  }

  // Organizer-facing: requires organization membership + permissions.
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ABSTRACT_READ)
  @Get('conferences/:conferenceId/abstracts')
  findAllForOrganizer(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.abstractsService.findAllForOrganizer(
      organizationId,
      conferenceId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ABSTRACT_OVERRIDE_DEADLINE)
  @Post('conferences/:conferenceId/abstracts/:id/force-submit')
  forceSubmit(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Param('id') abstractId: string,
  ) {
    return this.abstractsService.forceSubmit(
      organizationId,
      conferenceId,
      abstractId,
    );
  }
}
