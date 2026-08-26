import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.EMAIL_TEMPLATE_MANAGE)
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get()
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query('conferenceId') conferenceId?: string,
  ) {
    return this.emailTemplatesService.findAll(organizationId, conferenceId);
  }

  @Put(':id')
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') templateId: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.update(organizationId, templateId, dto);
  }
}
