'use client';

import { useSyncExternalStore } from 'react';
import { readCachedOrderResult } from './order-cache';
import type { CreateOrderResult } from './types';

function subscribe(): () => void {
  // sessionStorage writes from this same tab never fire a `storage`
  // event (only other tabs would see one), and `CheckoutFlow` already
  // updates its own state immediately after writing the cache — so
  // there is nothing external to subscribe to beyond the initial read.
  return () => {};
}

/** Reads the sessionStorage order cache as an external store — SSR-safe, no effect needed for the initial read. */
export function useCachedOrderResult(registrationId: string): CreateOrderResult | null {
  return useSyncExternalStore(
    subscribe,
    () => readCachedOrderResult(registrationId),
    () => null,
  );
}
