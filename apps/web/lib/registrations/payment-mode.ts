
import type { CreateOrderResult } from './types';

export type PaymentBranch =
  | { mode: 'gateway'; checkoutUrl: string }
  | { mode: 'manual' };

export function resolvePaymentBranch(
  result: CreateOrderResult,
): PaymentBranch {
  if (
    'checkoutUrl' in result &&
    typeof result.checkoutUrl === 'string' &&
    result.checkoutUrl.length > 0
  ) {
    return {
      mode: 'gateway',
      checkoutUrl: result.checkoutUrl,
    };
  }

  return { mode: 'manual' };
}
