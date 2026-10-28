"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { CheckoutFlow } from "@/components/registrations/checkout-flow";
import { Button } from "@/components/ui/button";

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = use(params);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href={`/registrations/${registrationId}`} />}
          className="-ml-3"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to registration
        </Button>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Complete your registration payment
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Continue to checkout to view the available payment method and submit
            your payment details.
          </p>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <CreditCard className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Payment checkout</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your payable amount and payment instructions will be shown during
              checkout.
            </p>
          </div>
        </div>

        <div className="mt-5 border-t pt-5">
          <CheckoutFlow registrationId={registrationId} />
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        Keep your transaction reference and payment receipt ready if manual
        payment is required. A registration remains pending until payment
        verification is completed.
      </p>
    </main>
  );
}
