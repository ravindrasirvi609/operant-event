'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useForceSubmitAbstract } from '@/hooks/use-organizer-abstracts';

export function ForceSubmitButton({ conferenceId, abstractId }: { conferenceId: string; abstractId: string }) {
  const [open, setOpen] = useState(false);
  const forceSubmit = useForceSubmitAbstract(conferenceId);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Force-submit
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Force-submit this abstract past the deadline?"
        description="This is an administrative override for a deadline exception, not a routine action."
        confirmLabel="Force-submit"
        isConfirming={forceSubmit.isPending}
        onConfirm={async () => {
          await forceSubmit.mutateAsync(abstractId);
          setOpen(false);
        }}
      />
    </>
  );
}
