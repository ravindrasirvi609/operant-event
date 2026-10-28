/**
 * Responsive breakdown bars for conference reports.
 * Uses lightweight CSS instead of a charting library.
 */

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-400',
  SUBMITTED: 'bg-blue-500',
  UNDER_REVIEW: 'bg-amber-500',
  IN_REVIEW: 'bg-amber-500',
  ACCEPTED: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
  WITHDRAWN: 'bg-slate-400',
  PENDING: 'bg-amber-500',
  CONFIRMED: 'bg-emerald-500',
  CANCELLED: 'bg-rose-500',
  PAID: 'bg-emerald-500',
  FAILED: 'bg-rose-500',
  REFUNDED: 'bg-violet-500',
  COMPLETED: 'bg-emerald-500',
};

const FALLBACK_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function getBarColor(key: string, index: number): string {
  return STATUS_COLORS[key.toUpperCase()] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function BreakdownBars({
  data,
  emptyLabel = 'No data yet.',
}: {
  data: Record<string, number>;
  emptyLabel?: string;
}) {
  const entries = Object.entries(data).filter(
    ([, value]) => Number.isFinite(value) && value > 0,
  );

  if (entries.length === 0) {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
        <p className="text-sm font-medium text-foreground">No report data</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const max = Math.max(...entries.map(([, value]) => value));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Status breakdown</p>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {total.toLocaleString()} total
        </span>
      </div>

      <ul className="space-y-5">
        {entries.map(([key, value], index) => {
          const percentage = (value / total) * 100;
          const relativeWidth = (value / max) * 100;
          const color = getBarColor(key, index);

          return (
            <li key={key} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`size-2.5 shrink-0 rounded-full ${color}`}
                  />
                  <span className="truncate text-sm font-medium text-foreground">
                    {formatLabel(key)}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {value.toLocaleString()}
                  </span>
                  <span className="min-w-12 text-right text-xs tabular-nums text-muted-foreground">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div
                className="h-2.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={`${formatLabel(key)}: ${value} (${percentage.toFixed(1)}%)`}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={value}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${color}`}
                  style={{ width: `${relativeWidth}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
