import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@operant-event/config';
import { ENV } from '../../common/env/env.module';
import { verifyStripeSignature } from './stripe-signature.util';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  ParsedWebhookEvent,
  PaymentProvider,
} from './payment-provider.interface';

interface StripeCheckoutSessionObject {
  id: string;
  payment_intent: string;
  amount_total: number;
  currency: string;
  payment_status: string;
}

/**
 * `createCheckout` calls Stripe's real Checkout Sessions API — genuinely
 * untestable without live credentials/network, unlike the signature
 * verification and payload parsing below, which are pure and fully
 * covered. Wire real STRIPE_* env vars and exercise this against Stripe's
 * test mode before relying on it in production.
 */
@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';

  constructor(@Inject(ENV) private readonly env: Env) {}

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    if (!this.env.STRIPE_SECRET_KEY) {
      throw new Error(
        'Stripe is not configured: set STRIPE_SECRET_KEY, or switch this conference to MANUAL payment mode.',
      );
    }

    const body = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': input.currency,
      'line_items[0][price_data][product_data][name]': `Registration ${input.orderNumber}`,
      'line_items[0][price_data][unit_amount]': String(
        Math.round(input.amount * 100),
      ),
      'line_items[0][quantity]': '1',
      client_reference_id: input.orderId,
      success_url: `https://checkout.stripe.com/success?order=${input.orderNumber}`,
      cancel_url: `https://checkout.stripe.com/cancel?order=${input.orderNumber}`,
    });

    const response = await fetch(
      'https://api.stripe.com/v1/checkout/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Stripe checkout session creation failed with status ${response.status}.`,
      );
    }

    const session = (await response.json()) as { id: string; url: string };
    return { checkoutUrl: session.url, providerOrderId: session.id };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!this.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe is not configured: set STRIPE_WEBHOOK_SECRET.');
    }
    return verifyStripeSignature(
      rawBody,
      signatureHeader,
      this.env.STRIPE_WEBHOOK_SECRET,
    );
  }

  parseWebhookEvent(rawBody: string): ParsedWebhookEvent {
    const payload = JSON.parse(rawBody) as {
      id?: string;
      type?: string;
      data?: { object?: StripeCheckoutSessionObject };
    };
    const object = payload.data?.object;
    if (
      !payload.id ||
      payload.type !== 'checkout.session.completed' ||
      !object?.payment_intent ||
      !object.id
    ) {
      throw new Error('Unrecognized Stripe webhook payload shape.');
    }

    return {
      eventId: payload.id,
      providerOrderId: object.id,
      providerPaymentId: object.payment_intent,
      status: object.payment_status === 'paid' ? 'SUCCESS' : 'FAILED',
      amount: object.amount_total / 100,
      currency: object.currency,
    };
  }
}
