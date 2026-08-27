'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { InvoiceView } from '@/components/registrations/invoice-view';
import { RefundButton } from '@/components/registrations/refund-button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useApproveManualPayment, useRejectManualPayment } from '@/hooks/use-payments';
import { useOrganizerInvoice } from '@/hooks/use-invoices';

type ActionResult = { kind: 'approved' | 'rejected' | 'error'; message: string } | null;

/**
 * There is no backend endpoint that lists orders with an outstanding
 * manual payment claim (`OrdersController`/`PaymentsController` expose
 * only single-order POST actions, never a GET/list) — a real gap, not a
 * client omission. Until a listing endpoint exists, this is a lookup
 * panel: the organizer acts on an order ID the registrant already
 * communicated (e.g. alongside their payment reference), rather than a
 * pre-populated table.
 */
export function PendingPaymentsQueue() {
  const [orderId, setOrderId] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [result, setResult] = useState<ActionResult>(null);
  const approve = useApproveManualPayment();
  const reject = useRejectManualPayment();
  const invoiceQuery = useOrganizerInvoice(orderId);

  async function handleApprove() {
    setResult(null);
    try {
      await approve.mutateAsync(orderId);
      setResult({ kind: 'approved', message: `Order ${orderId} approved.` });
    } catch (error) {
      setResult({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to approve order.' });
    }
  }

  async function handleReject() {
    setResult(null);
    try {
      await reject.mutateAsync(orderId);
      setRejectOpen(false);
      setResult({ kind: 'rejected', message: `Order ${orderId} rejected.` });
    } catch (error) {
      setResult({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to reject order.' });
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
        No endpoint lists orders with pending manual payments yet — act on an order ID the registrant has already
        given you.
      </div>
      <FormField label="Order ID" htmlFor="pending-payment-order-id">
        <Input id="pending-payment-order-id" value={orderId} onChange={(event) => setOrderId(event.target.value)} />
      </FormField>
      {result ? (
        <p role={result.kind === 'error' ? 'alert' : 'status'} className="text-sm">
          {result.message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button disabled={!orderId || approve.isPending} onClick={handleApprove}>
          Approve
        </Button>
        <Button variant="outline" disabled={!orderId} onClick={() => setRejectOpen(true)}>
          Reject
        </Button>
        {orderId ? <RefundButton orderId={orderId} /> : null}
      </div>
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this manual payment claim?"
        description="The registrant's payment is marked failed. The backend has no field to record a reason today."
        confirmLabel="Reject"
        isConfirming={reject.isPending}
        onConfirm={handleReject}
      />
      {orderId ? (
        <AsyncBoundary query={invoiceQuery}>{(invoice) => <InvoiceView invoice={invoice ?? null} />}</AsyncBoundary>
      ) : null}
    </div>
  );
}
