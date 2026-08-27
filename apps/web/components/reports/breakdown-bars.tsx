/**
 * Plain CSS bars, not a charting library — these dashboards are small,
 * single-snapshot aggregates (no date series, no drill-down), so a
 * bundled chart dependency wasn't judged worth the weight. Same
 * deliberate-scope-decision pattern as Phase 5's QR scanner.
 */
export function BreakdownBars({ data, emptyLabel = 'No data yet.' }: { data: Record<string, number>; emptyLabel?: string }) {
  const entries = Object.entries(data).filter(([, value]) => value > 0);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const max = Math.max(...entries.map(([, value]) => value));

  return (
    <ul className="space-y-2">
      {entries.map(([key, value]) => (
        <li key={key} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>{key}</span>
            <span className="text-muted-foreground">{value}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
