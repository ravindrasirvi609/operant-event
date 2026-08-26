import { createHmac } from 'node:crypto';
import { verifyRazorpaySignature } from './razorpay-signature.util';

const secret = 'razorpay-webhook-secret';

function sign(body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyRazorpaySignature', () => {
  it('accepts a signature computed with the correct secret', () => {
    const body = '{"event":"payment.captured"}';
    expect(verifyRazorpaySignature(body, sign(body), secret)).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const body = '{"event":"payment.captured"}';
    const wrongSignature = createHmac('sha256', 'a-different-secret')
      .update(body)
      .digest('hex');
    expect(verifyRazorpaySignature(body, wrongSignature, secret)).toBe(false);
  });

  it('rejects when the body has been tampered with after signing', () => {
    const originalBody = '{"event":"payment.captured","amount":100}';
    const tamperedBody = '{"event":"payment.captured","amount":999999}';
    expect(
      verifyRazorpaySignature(tamperedBody, sign(originalBody), secret),
    ).toBe(false);
  });

  it('rejects a malformed signature without throwing', () => {
    expect(
      verifyRazorpaySignature('{}', 'not-valid-hex-and-wrong-length', secret),
    ).toBe(false);
  });
});
