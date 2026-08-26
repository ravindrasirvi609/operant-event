import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // Registrant-facing: the invoice is generated automatically once
  // PaymentsService confirms the order PAID — this only reads it back.
  @UseGuards(JwtAuthGuard)
  @Get('orders/:orderId/invoice')
  findOwned(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.invoicesService.findOwned(user.id, orderId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PAYMENT_MANAGE)
  @Get('orders/:orderId/invoice/organizer')
  findForOrganizer(
    @CurrentOrganizationId() organizationId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.invoicesService.findForOrganizer(organizationId, orderId);
  }
}
