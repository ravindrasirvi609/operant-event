import type { Env } from '@operant-event/config';
import { RazorpayProvider } from './razorpay.provider';

describe('RazorpayProvider.createCheckout', () => {
  it('throws a clear configuration error when Razorpay credentials are not set', async () => {
    const provider = new RazorpayProvider({} as Env);

    await expect(
      provider.createCheckout({
        orderId: 'order-1',
        orderNumber: 'ORD-000001',
        amount: 2000,
        currency: 'INR',
      }),
    ).rejects.toThrow(/RAZORPAY_KEY_ID|RAZORPAY_KEY_SECRET/);
  });
});

describe('RazorpayProvider.verifyWebhookSignature', () => {
  it('throws a clear configuration error when no webhook secret is set', () => {
    const provider = new RazorpayProvider({} as Env);
    expect(() => provider.verifyWebhookSignature('{}', 'abc')).toThrow(
      /RAZORPAY_WEBHOOK_SECRET/,
    );
  });
});

describe('RazorpayProvider.parseWebhookEvent', () => {
  it('extracts the payment id, status, amount (converted from paise), and currency', () => {
    const provider = new RazorpayProvider({} as Env);
    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_abc123',
            order_id: 'order_xyz789',
            amount: 200000,
            currency: 'INR',
          },
        },
      },
    });

    const parsed = provider.parseWebhookEvent(rawBody);

    expect(parsed).toEqual({
      eventId: 'pay_abc123',
      providerOrderId: 'order_xyz789',
      providerPaymentId: 'pay_abc123',
      status: 'SUCCESS',
      amount: 2000,
      currency: 'INR',
    });
  });

  it('maps a payment.failed event to FAILED', () => {
    const provider = new RazorpayProvider({} as Env);
    const rawBody = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_abc123',
            order_id: 'order_xyz789',
            amount: 200000,
            currency: 'INR',
          },
        },
      },
    });

    expect(provider.parseWebhookEvent(rawBody).status).toBe('FAILED');
  });

  it('throws on an unrecognized payload shape instead of silently returning garbage', () => {
    const provider = new RazorpayProvider({} as Env);
    expect(() =>
      provider.parseWebhookEvent('{"event":"something.else"}'),
    ).toThrow();
  });
});
