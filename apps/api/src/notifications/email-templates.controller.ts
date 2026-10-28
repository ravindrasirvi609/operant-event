
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { EmailTemplatesService } from './email-templates.service';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { EnsureFeedbackCertificateTemplateDto } from './dto/ensure-feedback-certificate-template.dto';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { AllowSuperAdmin } from '../common/decorators/allow-super-admin.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@AllowSuperAdmin()
@RequirePermissions(PERMISSIONS.EMAIL_TEMPLATE_MANAGE)
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(
    private readonly emailTemplatesService: EmailTemplatesService,
  ) {}

  @Get()
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query('conferenceId') conferenceId?: string,
  ) {
    return this.emailTemplatesService.findAll(
      organizationId,
      conferenceId,
    );
  }

  @Post('feedback-certificate-default')
  ensureFeedbackCertificateTemplate(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: EnsureFeedbackCertificateTemplateDto,
  ) {
    return this.emailTemplatesService.ensureFeedbackCertificateTemplate(
      organizationId,
      dto.conferenceId,
    );
  }

  @Put(':id')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') templateId: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.update(
      organizationId,
      templateId,
      dto,
    );
  }
}
