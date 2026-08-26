import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stripe's Stripe-Signature header looks like `t=<timestamp>,v1=<hex hmac>`.
 * The signed payload is `${timestamp}.${rawBody}`, HMAC-SHA256'd under the
 * endpoint's webhook signing secret.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const parts = new Map(
    signatureHeader
      .split(',')
      .map((part) => part.split('='))
      .filter((pair) => pair.length === 2)
      .map(([key, value]) => [key, value]),
  );

  const timestamp = parts.get('t');
  const signature = parts.get('v1');
  if (!timestamp || !signature) {
    return false;
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
