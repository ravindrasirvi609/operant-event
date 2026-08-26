import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay webhooks sign the raw body with HMAC-SHA256 under the
 * dashboard-configured webhook secret, sent as a hex digest in the
 * X-Razorpay-Signature header.
 */
export function verifyRazorpaySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signatureHeader, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
