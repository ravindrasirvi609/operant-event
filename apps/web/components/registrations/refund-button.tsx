'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRefundPayment } from '@/hooks/use-payments';

/** SRS §35 high-impact-action rule: refund requires typing "REFUND" to confirm. */
export function RefundButton({ orderId, onRefunded }: { orderId: string; onRefunded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refund = useRefundPayment();

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Refund
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Refund this order?"
        description="This is irreversible and immediately notifies the registrant."
        confirmLabel="Refund"
        requireTypedConfirmation="REFUND"
        isConfirming={refund.isPending}
        onConfirm={async () => {
          setError(null);
          try {
            await refund.mutateAsync(orderId);
            setOpen(false);
            onRefunded?.();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refund order.');
          }
        }}
      />
    </>
  );
}
