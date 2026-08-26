import type { Env } from '@operant-event/config';
import { StripeProvider } from './stripe.provider';

describe('StripeProvider.createCheckout', () => {
  it('throws a clear configuration error when Stripe credentials are not set', async () => {
    const provider = new StripeProvider({} as Env);

    await expect(
      provider.createCheckout({
        orderId: 'order-1',
        orderNumber: 'ORD-000001',
        amount: 20,
        currency: 'USD',
      }),
    ).rejects.toThrow(/STRIPE_SECRET_KEY/);
  });
});

describe('StripeProvider.verifyWebhookSignature', () => {
  it('throws a clear configuration error when no webhook secret is set', () => {
    const provider = new StripeProvider({} as Env);
    expect(() => provider.verifyWebhookSignature('{}', 't=1,v1=abc')).toThrow(
      /STRIPE_WEBHOOK_SECRET/,
    );
  });
});

describe('StripeProvider.parseWebhookEvent', () => {
  it('extracts the event id, payment intent, status, amount (converted from cents), and currency on success', () => {
    const provider = new StripeProvider({} as Env);
    const rawBody = JSON.stringify({
      id: 'evt_abc123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_xyz789',
          payment_intent: 'pi_abc123',
          amount_total: 2000,
          currency: 'usd',
          payment_status: 'paid',
        },
      },
    });

    const parsed = provider.parseWebhookEvent(rawBody);

    expect(parsed).toEqual({
      eventId: 'evt_abc123',
      providerOrderId: 'cs_xyz789',
      providerPaymentId: 'pi_abc123',
      status: 'SUCCESS',
      amount: 20,
      currency: 'usd',
    });
  });

  it('maps an unpaid checkout session to FAILED', () => {
    const provider = new StripeProvider({} as Env);
    const rawBody = JSON.stringify({
      id: 'evt_abc123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_xyz789',
          payment_intent: 'pi_abc123',
          amount_total: 2000,
          currency: 'usd',
          payment_status: 'unpaid',
        },
      },
    });

    expect(provider.parseWebhookEvent(rawBody).status).toBe('FAILED');
  });

  it('throws on an unrecognized payload shape instead of silently returning garbage', () => {
    const provider = new StripeProvider({} as Env);
    expect(() =>
      provider.parseWebhookEvent('{"type":"something.else","data":{}}'),
    ).toThrow();
  });
});
