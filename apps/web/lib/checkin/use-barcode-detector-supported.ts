'use client';

import { useSyncExternalStore } from 'react';

function subscribe(): () => void {
  // Browser capability, not external state that changes — nothing to subscribe to.
  return () => {};
}

/** SSR-safe capability check (server always has no `window`) — avoids a hydration mismatch without a setState-in-effect. */
export function useBarcodeDetectorSupported(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => typeof window !== 'undefined' && 'BarcodeDetector' in window,
    () => false,
  );
}
