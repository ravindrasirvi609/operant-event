
import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { PaymentProvidersModule } from './providers/payment-providers.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    PaymentProvidersModule,
    InvoicesModule,
    FilesModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
