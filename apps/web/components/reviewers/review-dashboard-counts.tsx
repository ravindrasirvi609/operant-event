import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import type { DashboardCounts } from '@/lib/reviewers/types';

export function ReviewDashboardCounts({ counts }: { counts: DashboardCounts }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ClipboardList className="size-4" />
          <span className="text-xs">Assigned</span>
        </div>
        <p className="mt-1 text-2xl font-semibold">{counts.assigned}</p>
      </div>
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="size-4" />
          <span className="text-xs">Completed</span>
        </div>
        <p className="mt-1 text-2xl font-semibold">{counts.completed}</p>
      </div>
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" />
          <span className="text-xs font-medium">Overdue</span>
        </div>
        <p className="mt-1 text-2xl font-semibold text-destructive">{counts.overdue}</p>
      </div>
    </div>
  );
}
