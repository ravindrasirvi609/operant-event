export function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
