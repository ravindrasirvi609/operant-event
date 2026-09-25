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

// `useSyncExternalStore` compares snapshots with Object.is. Parsing the same
// sessionStorage value on every read creates a new object each time, which
// makes React think the store changed forever. Keep one stable snapshot per
// registration for the lifetime of this client module.
const snapshots = new Map<string, CreateOrderResult | null>();

function getSnapshot(registrationId: string): CreateOrderResult | null {
  if (!snapshots.has(registrationId)) {
    snapshots.set(registrationId, readCachedOrderResult(registrationId));
  }
  return snapshots.get(registrationId) ?? null;
}

/** Reads the sessionStorage order cache as an external store — SSR-safe, no effect needed for the initial read. */
export function useCachedOrderResult(registrationId: string): CreateOrderResult | null {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(registrationId),
    () => null,
  );
}
