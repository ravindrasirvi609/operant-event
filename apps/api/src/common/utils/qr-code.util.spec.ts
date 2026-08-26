import { generateQrCode } from './qr-code.util';

describe('generateQrCode', () => {
  it('returns a 16-character uppercase hex string', () => {
    const code = generateQrCode();

    expect(code).toMatch(/^[0-9A-F]{16}$/);
  });

  it('returns a different code on each call', () => {
    expect(generateQrCode()).not.toBe(generateQrCode());
  });
});
