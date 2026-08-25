import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConferenceFormFieldsService } from './conference-form-fields.service';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { UpdateFormFieldDto } from './dto/update-form-field.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller('conferences/:conferenceId/form-fields')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConferenceFormFieldsController {
  constructor(
    private readonly formFieldsService: ConferenceFormFieldsService,
  ) {}

  @RequirePermissions(PERMISSIONS.CONFERENCE_READ)
  @Get()
  findActive(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.formFieldsService.findActive(organizationId, conferenceId);
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_UPDATE)
  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateFormFieldDto,
  ) {
    return this.formFieldsService.create(organizationId, conferenceId, dto);
  }

  @RequirePermissions(PERMISSIONS.CONFERENCE_UPDATE)
  @Patch(':fieldId')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateFormFieldDto,
  ) {
    return this.formFieldsService.update(
      organizationId,
      conferenceId,
      fieldId,
      dto,
    );
  }
}
