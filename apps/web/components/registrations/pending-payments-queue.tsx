
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { OrderStatusBadge } from '@/components/registrations/order-status-badge';
import { RefundButton } from '@/components/registrations/refund-button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useConferenceOrders } from '@/hooks/use-orders';
import {
  useApproveManualPayment,
  useRejectManualPayment,
} from '@/hooks/use-payments';

type ActionResult = {
  kind: 'approved' | 'rejected' | 'error';
  message: string;
} | null;

type ManualPayment = {
  id: string;
  provider: string;
  status: string;
  reference: string | null;
  proofFileId: string | null;
};

type OrderWithPayments = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  payments?: ManualPayment[];
};

export function PendingPaymentsQueue({
  conferenceId,
}: {
  conferenceId: string;
}) {
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ALL'>(
    'PENDING',
  );

  const ordersQuery = useConferenceOrders(
    conferenceId,
    statusFilter === 'PENDING' ? 'PENDING' : undefined,
  );

  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [result, setResult] = useState<ActionResult>(null);

  const approve = useApproveManualPayment();
  const reject = useRejectManualPayment();

  // Automatically dismiss successful action messages after 3 seconds.
  // Keep error messages visible until another action is performed.
  useEffect(() => {
    if (!result || result.kind === 'error') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResult(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [result]);

  async function handleApprove(orderId: string) {
    setResult(null);

    try {
      await approve.mutateAsync(orderId);
      await ordersQuery.refetch();

      setResult({
        kind: 'approved',
        message: 'Payment approved successfully.',
      });
    } catch (error) {
      setResult({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to approve payment.',
      });
    }
  }

  async function handleReject() {
    if (!rejectOrderId) {
      return;
    }

    setResult(null);

    try {
      await reject.mutateAsync({
        orderId: rejectOrderId,
        reason: rejectReason || undefined,
      });

      await ordersQuery.refetch();

      setResult({
        kind: 'rejected',
        message: 'Payment rejected.',
      });

      setRejectOrderId(null);
      setRejectReason('');
    } catch (error) {
      setResult({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to reject payment.',
      });
    }
  }

  function openPaymentProof(orderId: string, paymentId: string) {
    const proofUrl =
      `/api/proxy/orders/${encodeURIComponent(orderId)}` +
      `/payments/${encodeURIComponent(paymentId)}/proof`;

    window.open(proofUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="w-full max-w-full space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending
        </Button>

        <Button
          size="sm"
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('ALL')}
        >
          All
        </Button>
      </div>

      {result ? (
        <p
          role={result.kind === 'error' ? 'alert' : 'status'}
          aria-live={result.kind === 'error' ? 'assertive' : 'polite'}
          className={`text-sm ${
            result.kind === 'error'
              ? 'text-destructive'
              : 'text-green-600'
          }`}
        >
          {result.message}
        </p>
      ) : null}

      <AsyncBoundary
        query={ordersQuery}
        empty={
          <p className="text-sm text-muted-foreground">
            No orders found.
          </p>
        }
      >
        {(orders) => (
          <div className="w-full overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-3">Order</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3" colSpan={2}>
                    Payment Details / Proof
                  </th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {(orders as OrderWithPayments[]).map((order) => {
                  const manualPayments = (order.payments ?? []).filter(
                    (payment) => payment.provider === 'MANUAL',
                  );

                  return (
                    <tr
                      key={order.id}
                      className="border-t align-top"
                    >
                      <td className="px-3 py-3 font-medium">
                        {order.orderNumber}
                      </td>

                      <td className="px-3 py-3">
                        <OrderStatusBadge
                          status={
                            order.status as Parameters<
                              typeof OrderStatusBadge
                            >[0]['status']
                          }
                        />
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {order.total} {order.currency}
                      </td>

                      <td colSpan={2} className="px-3 py-3 align-top">
                        {manualPayments.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {manualPayments.map((payment) => (
                              <div
                                key={payment.id}
                                className="grid grid-cols-1 gap-2 border-b pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(180px,1fr)_auto] sm:items-center sm:gap-4"
                              >
                                <div className="min-w-0">
                                  <p className="break-all">
                                    {payment.reference || 'Not provided'}
                                  </p>

                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Payment: {payment.status}
                                  </p>
                                </div>

                                {payment.proofFileId ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-fit shrink-0"
                                    onClick={() =>
                                      openPaymentProof(
                                        order.id,
                                        payment.id,
                                      )
                                    }
                                  >
                                    View / Download
                                  </Button>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    No proof uploaded
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            No manual payment
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {order.status === 'PENDING' ? (
                            <>
                              <Button
                                size="sm"
                                disabled={approve.isPending}
                                onClick={() => handleApprove(order.id)}
                              >
                                Approve
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={reject.isPending}
                                onClick={() =>
                                  setRejectOrderId(order.id)
                                }
                              >
                                Reject
                              </Button>
                            </>
                          ) : null}

                          {order.status === 'PAID' ? (
                            <RefundButton
                              orderId={order.id}
                              onRefunded={() => ordersQuery.refetch()}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AsyncBoundary>

      <ConfirmDialog
        open={rejectOrderId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectOrderId(null);
          }
        }}
        title="Reject this manual payment claim?"
        description="The registrant's payment is marked failed and notified."
        confirmLabel="Reject"
        isConfirming={reject.isPending}
        onConfirm={handleReject}
      >
        <FormField
          label="Reason (optional)"
          htmlFor="reject-reason"
        >
          <Input
            id="reject-reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        </FormField>
      </ConfirmDialog>
    </div>
  );
}
