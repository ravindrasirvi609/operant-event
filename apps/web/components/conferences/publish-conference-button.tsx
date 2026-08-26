'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { usePublishConference } from '@/hooks/use-conferences';
import type { ConferenceStatus } from '@/lib/conferences/types';

export function PublishConferenceButton({ conferenceId, status }: { conferenceId: string; status: ConferenceStatus }) {
  const [open, setOpen] = useState(false);
  const publish = usePublishConference(conferenceId);
  const isPublished = status !== 'DRAFT';

  if (isPublished) {
    return (
      <Button variant="outline" disabled>
        Published
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Publish conference</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Publish this conference?"
        description="Publishing makes the conference visible to participants. This does not need typed confirmation — it isn't destructive."
        confirmLabel="Publish"
        isConfirming={publish.isPending}
        onConfirm={async () => {
          await publish.mutateAsync();
          setOpen(false);
        }}
      />
    </>
  );
}
