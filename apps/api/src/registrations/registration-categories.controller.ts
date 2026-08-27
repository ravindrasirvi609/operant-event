import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RegistrationCategoriesService } from './registration-categories.service';
import { CreateRegistrationCategoryDto } from './dto/create-registration-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

// Registrant-facing: browse categories/pricing to choose one to register
// for. No org context — matches RegistrationsController's own
// registrant-facing routes.
@UseGuards(JwtAuthGuard)
@Controller('conferences/:conferenceId/registration-options')
export class RegistrationOptionsController {
  constructor(
    private readonly registrationCategoriesService: RegistrationCategoriesService,
  ) {}

  @Get()
  findAllForRegistration(@Param('conferenceId') conferenceId: string) {
    return this.registrationCategoriesService.findAllForRegistration(
      conferenceId,
    );
  }
}

// Organizer-facing: registration category setup for a conference.
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.REGISTRATION_MANAGE)
@Controller('conferences/:conferenceId/registration-categories')
export class RegistrationCategoriesController {
  constructor(
    private readonly registrationCategoriesService: RegistrationCategoriesService,
  ) {}

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateRegistrationCategoryDto,
  ) {
    return this.registrationCategoriesService.create(
      organizationId,
      conferenceId,
      dto,
    );
  }

  @Get()
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.registrationCategoriesService.findAll(
      organizationId,
      conferenceId,
    );
  }
}
