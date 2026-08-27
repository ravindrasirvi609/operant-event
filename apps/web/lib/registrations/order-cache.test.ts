import { beforeEach, describe, expect, it } from 'vitest';
import { cacheOrderResult, readCachedOrderResult } from './order-cache';
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

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('order-cache', () => {
  it('returns null when nothing has been cached for a registration', () => {
    expect(readCachedOrderResult('reg_1')).toBeNull();
  });

  it('reads back exactly what was cached, keyed by registrationId', () => {
    const result: CreateOrderResult = { order, checkoutUrl: 'https://gateway.example/checkout/abc' };
    cacheOrderResult('reg_1', result);

    expect(readCachedOrderResult('reg_1')).toEqual(result);
    expect(readCachedOrderResult('reg_2')).toBeNull();
  });
});
