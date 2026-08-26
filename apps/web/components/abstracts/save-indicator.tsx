'use client';

import { Button } from '@/components/ui/button';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** SRS §35: submission forms must show save state visibly — never a silent background save. */
export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  if (state === 'saving') {
    return <p className="text-sm text-muted-foreground">Saving…</p>;
  }
  if (state === 'saved') {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Saved
      </p>
    );
  }
  if (state === 'error') {
    return (
      <div role="alert" className="flex items-center gap-2 text-sm text-destructive">
        <span>Save failed.</span>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }
  return null;
}
