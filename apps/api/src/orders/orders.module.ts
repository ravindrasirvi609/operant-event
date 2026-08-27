import { Module } from '@nestjs/common';
import {
  OrdersController,
  OrderDetailController,
  ConferenceOrdersController,
} from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentProvidersModule } from '../payments/providers/payment-providers.module';

@Module({
  imports: [PaymentProvidersModule],
  controllers: [
    OrdersController,
    OrderDetailController,
    ConferenceOrdersController,
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
