import { Module } from '@nestjs/common';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';
import {
  PAYMENT_PROVIDERS,
  type PaymentProvider,
} from './payment-provider.interface';

/**
 * Builds the PAYMENT_PROVIDERS map (provider name -> implementation) that
 * OrdersService and PaymentsService both inject — shared here so a
 * conference's paymentMode/provider choice can resolve either Razorpay or
 * Stripe by name without either service importing a concrete SDK type.
 */
@Module({
  providers: [
    RazorpayProvider,
    StripeProvider,
    {
      provide: PAYMENT_PROVIDERS,
      useFactory: (
        razorpay: RazorpayProvider,
        stripe: StripeProvider,
      ): Map<string, PaymentProvider> =>
        new Map<string, PaymentProvider>([
          [razorpay.name, razorpay],
          [stripe.name, stripe],
        ]),
      inject: [RazorpayProvider, StripeProvider],
    },
  ],
  exports: [PAYMENT_PROVIDERS],
})
export class PaymentProvidersModule {}
