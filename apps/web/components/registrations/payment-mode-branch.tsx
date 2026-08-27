'use client';

import { ManualPaymentInstructions } from '@/components/registrations/manual-payment-instructions';
import { PaymentProofUpload } from '@/components/registrations/payment-proof-upload';
import { resolvePaymentBranch } from '@/lib/registrations/payment-mode';
import { useSubmitManualPaymentProof } from '@/hooks/use-payments';
import type { CreateOrderResult } from '@/lib/registrations/types';

interface PaymentModeBranchProps {
  orderResult: CreateOrderResult;
  orderId: string;
  manualInstructionsText?: string;
  /**
   * Accepted only so a call site can pass what it already fetched from
   * `ConferenceSetting.paymentMode` for display elsewhere — never used
   * here to decide the branch. `resolvePaymentBranch` reads only
   * `orderResult`.
   */
  settingsPaymentMode?: string;
}

export function PaymentModeBranch({ orderResult, orderId, manualInstructionsText }: PaymentModeBranchProps) {
  const branch = resolvePaymentBranch(orderResult);
  const submitProof = useSubmitManualPaymentProof(orderId);

  if (branch.mode === 'gateway') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Confirming payment can take a few seconds after you return.</p>
        <a
          href={branch.checkoutUrl}
          className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Continue to payment
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ManualPaymentInstructions instructions={manualInstructionsText} />
      <PaymentProofUpload onSubmit={(input) => submitProof.mutateAsync(input).then(() => undefined)} />
    </div>
  );
}
