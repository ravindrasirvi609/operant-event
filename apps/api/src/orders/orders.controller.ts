import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

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
