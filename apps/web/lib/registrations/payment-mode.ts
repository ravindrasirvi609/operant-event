import type { CreateOrderResult } from './types';

export type PaymentBranch = { mode: 'gateway'; checkoutUrl: string } | { mode: 'manual' };

/**
 * Branches purely on which key `OrdersService.create` returned — never on
 * a separately-fetched `ConferenceSetting.paymentMode` — because the
 * order-creation response is authoritative even if settings changed
 * between page load and checkout.
 */
export function resolvePaymentBranch(result: CreateOrderResult): PaymentBranch {
  if ('checkoutUrl' in result) {
    return { mode: 'gateway', checkoutUrl: result.checkoutUrl };
  }
  return { mode: 'manual' };
}
