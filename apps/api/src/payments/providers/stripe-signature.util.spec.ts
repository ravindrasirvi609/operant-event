import { createHmac } from 'node:crypto';
import { verifyStripeSignature } from './stripe-signature.util';

const secret = 'stripe-webhook-secret';

function sign(body: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${body}`;
  return createHmac('sha256', secret).update(signedPayload).digest('hex');
}

function header(body: string, timestamp: number): string {
  return `t=${timestamp},v1=${sign(body, timestamp)}`;
}

describe('verifyStripeSignature', () => {
  it('accepts a signature header computed with the correct secret', () => {
    const body = '{"type":"payment_intent.succeeded"}';
    const timestamp = Math.floor(Date.now() / 1000);
    expect(verifyStripeSignature(body, header(body, timestamp), secret)).toBe(
      true,
    );
  });

  it('rejects a signature header computed with the wrong secret', () => {
    const body = '{"type":"payment_intent.succeeded"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const wrongSignature = createHmac('sha256', 'a-different-secret')
      .update(`${timestamp}.${body}`)
      .digest('hex');
    expect(
      verifyStripeSignature(
        body,
        `t=${timestamp},v1=${wrongSignature}`,
        secret,
      ),
    ).toBe(false);
  });

  it('rejects when the body has been tampered with after signing', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const originalBody = '{"amount":100}';
    const tamperedBody = '{"amount":999999}';
    expect(
      verifyStripeSignature(
        tamperedBody,
        header(originalBody, timestamp),
        secret,
      ),
    ).toBe(false);
  });

  it('rejects a header missing the v1 signature', () => {
    expect(verifyStripeSignature('{}', 't=12345', secret)).toBe(false);
  });

  it('rejects a completely malformed header without throwing', () => {
    expect(verifyStripeSignature('{}', 'not-a-real-header', secret)).toBe(
      false,
    );
  });
});
