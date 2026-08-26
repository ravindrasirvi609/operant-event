export interface CreateCheckoutInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  providerOrderId: string;
}

export interface ParsedWebhookEvent {
  eventId: string;
  providerOrderId: string;
  providerPaymentId: string;
  status: 'SUCCESS' | 'FAILED';
  amount: number;
  currency: string;
}

/**
 * SRS §5 provider abstraction / PAY-001: OrdersService and the webhook
 * handler depend only on this interface, never on a concrete Razorpay/Stripe
 * SDK type — the GATEWAY-vs-MANUAL choice and the Razorpay-vs-Stripe choice
 * both stay swappable behind it.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
  parseWebhookEvent(rawBody: string): ParsedWebhookEvent;
}

export const PAYMENT_PROVIDERS = Symbol('PAYMENT_PROVIDERS');
