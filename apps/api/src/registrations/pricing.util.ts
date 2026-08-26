export interface PricingWindow {
  id: string;
  price: number;
  startDate: Date;
  endDate: Date;
}

/**
 * §13.2: "The effective price is determined from conference dates and
 * pricing rules." Windows aren't expected to overlap in normal use, but if
 * they do (an admin correction, say), the most recently started one wins —
 * it's the newest intent.
 */
export function resolveEffectivePricingWindow(
  windows: PricingWindow[],
  now: Date,
): PricingWindow | null {
  const active = windows.filter(
    (window) => window.startDate <= now && now <= window.endDate,
  );
  if (active.length === 0) {
    return null;
  }
  return active.reduce((latest, window) =>
    window.startDate > latest.startDate ? window : latest,
  );
}
