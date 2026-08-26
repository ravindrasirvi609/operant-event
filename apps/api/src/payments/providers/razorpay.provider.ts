import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@operant-event/config';
import { ENV } from '../../common/env/env.module';
import { verifyRazorpaySignature } from './razorpay-signature.util';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  ParsedWebhookEvent,
  PaymentProvider,
} from './payment-provider.interface';

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
}

/**
 * `createCheckout` calls Razorpay's real Orders API — genuinely
 * untestable without live credentials/network, unlike the signature
 * verification and payload parsing below, which are pure and fully
 * covered. Wire real RAZORPAY_* env vars and exercise this against
 * Razorpay's sandbox before relying on it in production.
 */
@Injectable()
export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';

  constructor(@Inject(ENV) private readonly env: Env) {}

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    if (!this.env.RAZORPAY_KEY_ID || !this.env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        'Razorpay is not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or switch this conference to MANUAL payment mode.',
      );
    }

    const auth = Buffer.from(
      `${this.env.RAZORPAY_KEY_ID}:${this.env.RAZORPAY_KEY_SECRET}`,
    ).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        receipt: input.orderNumber,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Razorpay order creation failed with status ${response.status}.`,
      );
    }

    const body = (await response.json()) as { id: string };
    return {
      checkoutUrl: `https://checkout.razorpay.com/v1/checkout.html?order_id=${body.id}`,
      providerOrderId: body.id,
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!this.env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error(
        'Razorpay is not configured: set RAZORPAY_WEBHOOK_SECRET.',
      );
    }
    return verifyRazorpaySignature(
      rawBody,
      signatureHeader,
      this.env.RAZORPAY_WEBHOOK_SECRET,
    );
  }

  parseWebhookEvent(rawBody: string): ParsedWebhookEvent {
    const payload = JSON.parse(rawBody) as {
      event?: string;
      payload?: { payment?: { entity?: RazorpayPaymentEntity } };
    };
    const entity = payload.payload?.payment?.entity;
    if (!entity?.id || !entity.order_id) {
      throw new Error('Unrecognized Razorpay webhook payload shape.');
    }

    return {
      eventId: entity.id,
      providerOrderId: entity.order_id,
      providerPaymentId: entity.id,
      status: payload.event === 'payment.captured' ? 'SUCCESS' : 'FAILED',
      amount: entity.amount / 100,
      currency: entity.currency,
    };
  }
}
