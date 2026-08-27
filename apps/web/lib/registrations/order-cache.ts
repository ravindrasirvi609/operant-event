import type { CreateOrderResult } from './types';

const KEY_PREFIX = 'operant-event:order:';

/**
 * There is no `GET orders/:orderId` or `GET
 * registrations/:registrationId/orders` endpoint on the backend — the
 * order-creation response is the *only* place an order's id/checkoutUrl
 * is ever surfaced. This sessionStorage cache is a same-tab, best-effort
 * mitigation for a hard refresh right after order creation, not real
 * server-state resilience: a refresh in a different tab/device, or a
 * cleared session, loses this and there is currently no way to recover
 * it from the server.
 */
export function cacheOrderResult(registrationId: string, result: CreateOrderResult): void {
  window.sessionStorage.setItem(KEY_PREFIX + registrationId, JSON.stringify(result));
}

export function readCachedOrderResult(registrationId: string): CreateOrderResult | null {
  const raw = window.sessionStorage.getItem(KEY_PREFIX + registrationId);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as CreateOrderResult;
}
