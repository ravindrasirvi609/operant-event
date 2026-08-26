import { randomBytes } from 'node:crypto';

export function generateQrCode(): string {
  return randomBytes(8).toString('hex').toUpperCase();
}
