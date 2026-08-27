'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { OrderStatusBadge } from '@/components/registrations/order-status-badge';
import { RefundButton } from '@/components/registrations/refund-button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useConferenceOrders } from '@/hooks/use-orders';
import { useApproveManualPayment, useRejectManualPayment } from '@/hooks/use-payments';

type ActionResult = { kind: 'approved' | 'rejected' | 'error'; message: string } | null;

/** Lists orders for the conference, defaulting to PENDING to surface outstanding manual payment claims. */
export function PendingPaymentsQueue({ conferenceId }: { conferenceId: string }) {
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const ordersQuery = useConferenceOrders(conferenceId, statusFilter === 'PENDING' ? 'PENDING' : undefined);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [result, setResult] = useState<ActionResult>(null);
  const approve = useApproveManualPayment();
  const reject = useRejectManualPayment();

  async function handleApprove(orderId: string) {
    setResult(null);
    try {
      await approve.mutateAsync(orderId);
      await ordersQuery.refetch();
      setResult({ kind: 'approved', message: `Order ${orderId} approved.` });
    } catch (error) {
      setResult({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to approve order.' });
    }
  }

  async function handleReject() {
    if (!rejectOrderId) {
      return;
    }
    setResult(null);
    try {
      await reject.mutateAsync({ orderId: rejectOrderId, reason: rejectReason || undefined });
      await ordersQuery.refetch();
      setResult({ kind: 'rejected', message: `Order ${rejectOrderId} rejected.` });
      setRejectOrderId(null);
      setRejectReason('');
    } catch (error) {
      setResult({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to reject order.' });
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending
        </Button>
        <Button size="sm" variant={statusFilter === 'ALL' ? 'default' : 'outline'} onClick={() => setStatusFilter('ALL')}>
          All
        </Button>
      </div>
      {result ? (
        <p role={result.kind === 'error' ? 'alert' : 'status'} className="text-sm">
          {result.message}
        </p>
      ) : null}
      <AsyncBoundary query={ordersQuery} empty={<p className="text-sm text-muted-foreground">No orders found.</p>}>
        {(orders) => (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1">Order</th>
                <th className="py-1">Status</th>
                <th className="py-1">Total</th>
                <th className="py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="py-2">{order.orderNumber}</td>
                  <td className="py-2">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-2">
                    {order.total} {order.currency}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      {order.status === 'PENDING' ? (
                        <>
                          <Button size="sm" disabled={approve.isPending} onClick={() => handleApprove(order.id)}>
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setRejectOrderId(order.id)}>
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {order.status === 'PAID' ? <RefundButton orderId={order.id} onRefunded={() => ordersQuery.refetch()} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>
      <ConfirmDialog
        open={rejectOrderId !== null}
        onOpenChange={(open) => !open && setRejectOrderId(null)}
        title="Reject this manual payment claim?"
        description="The registrant's payment is marked failed and notified."
        confirmLabel="Reject"
        isConfirming={reject.isPending}
        onConfirm={handleReject}
      >
        <FormField label="Reason (optional)" htmlFor="reject-reason">
          <Input id="reject-reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
        </FormField>
      </ConfirmDialog>
    </div>
  );
}
