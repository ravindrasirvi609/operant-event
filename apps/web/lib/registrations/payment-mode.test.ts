import { describe, expect, it } from 'vitest';
import { resolvePaymentBranch } from './payment-mode';
import type { CreateOrderResult, Order } from './types';

const order: Order = {
  id: 'order_1',
  conferenceId: 'conf_1',
  registrationId: 'reg_1',
  orderNumber: 'ORD-000001',
  subtotal: 100,
  discount: 0,
  tax: 0,
  total: 100,
  currency: 'USD',
  status: 'PENDING',
};

describe('resolvePaymentBranch', () => {
  it('branches to gateway when the response carries checkoutUrl', () => {
    const result: CreateOrderResult = { order, checkoutUrl: 'https://gateway.example/checkout/abc' };

    expect(resolvePaymentBranch(result)).toEqual({ mode: 'gateway', checkoutUrl: 'https://gateway.example/checkout/abc' });
  });

  it('branches to manual when the response carries manualPaymentInstructions', () => {
    const result: CreateOrderResult = { order, manualPaymentInstructions: true };

    expect(resolvePaymentBranch(result)).toEqual({ mode: 'manual' });
  });

  it('ignores a disagreeing externally-fetched payment mode and trusts the response shape only', () => {
    const result: CreateOrderResult = { order, checkoutUrl: 'https://gateway.example/checkout/xyz' };
    const disagreeingSettingsPaymentMode = 'MANUAL';

    const branch = resolvePaymentBranch(result);

    expect(branch.mode).toBe('gateway');
    expect(disagreeingSettingsPaymentMode).toBe('MANUAL');
  });
});
