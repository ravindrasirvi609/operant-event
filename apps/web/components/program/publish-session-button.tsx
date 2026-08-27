'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { usePublishSession } from '@/hooks/use-sessions';
import type { SessionStatus } from '@/lib/program/types';

/** Publishing has no readiness check server-side (no speakers/presentations required) — the UI copy makes clear further edits create a new public version, not a silent mutation. */
export function PublishSessionButton({ conferenceId, sessionId, status }: { conferenceId: string; sessionId: string; status: SessionStatus }) {
  const [open, setOpen] = useState(false);
  const publish = usePublishSession(conferenceId);

  if (status === 'PUBLISHED') {
    return null;
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Publish
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Publish this session?"
        description="Publishing puts it on the public program page. Further edits change the public version, they don't create a separate draft."
        confirmLabel="Publish"
        isConfirming={publish.isPending}
        onConfirm={async () => {
          await publish.mutateAsync(sessionId);
          setOpen(false);
        }}
      />
    </>
  );
}
