import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

// Registrant-facing: creates an order (and, in GATEWAY mode, a checkout
// session) for the caller's own registration.
@UseGuards(JwtAuthGuard)
@Controller('registrations/:registrationId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('registrationId') registrationId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(user.id, registrationId, dto.provider);
  }
}

/**
 * There is no `GET registrations/:registrationId/orders` either — the
 * only way an order's id is ever surfaced is the create response. This
 * gives the owner (no org context) and the organizer (PAYMENT_MANAGE) a
 * real way to look one up again by id afterward.
 */
@UseGuards(JwtAuthGuard)
@Controller('orders/:orderId')
export class OrderDetailController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findOwned(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.findOwned(user.id, orderId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PAYMENT_MANAGE)
  @Get('organizer')
  findForOrganizer(
    @CurrentOrganizationId() organizationId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.findForOrganizer(organizationId, orderId);
  }
}

/** Organizer-facing: fixes the real gap behind the manual-payments queue — there was no way to list outstanding orders at all. */
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.PAYMENT_MANAGE)
@Controller('conferences/:conferenceId/orders')
export class ConferenceOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAllForOrganizer(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findAllForOrganizer(
      organizationId,
      conferenceId,
      status,
    );
  }
}
