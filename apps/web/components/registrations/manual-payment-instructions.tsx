/**
 * `ConferenceSetting` has no free-text instructions field yet (checked:
 * only `paymentMode`, no `manualPaymentInstructions: String?`) — this
 * renders whatever text is passed in, defaulting to a generic fallback,
 * so wiring a real field later is a one-line change at the call site.
 */
export function ManualPaymentInstructions({ instructions }: { instructions?: string }) {
  return (
    <div className="rounded-lg border p-4 text-sm">
      <h3 className="font-semibold">Manual payment</h3>
      <p className="mt-1 text-muted-foreground">
        {instructions ?? 'Contact the organizer for bank transfer or cheque instructions — this conference has not configured payment instructions text yet.'}
      </p>
    </div>
  );
}
