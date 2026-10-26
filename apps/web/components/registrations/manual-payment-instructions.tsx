interface ManualPaymentInstructionsProps {
  instructions?: string;
}

function formatInstructions(text: string) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export function ManualPaymentInstructions({
  instructions,
}: ManualPaymentInstructionsProps) {
  const text =
    instructions?.trim() ||
    'Contact the organizer for bank transfer or cheque instructions. Payment instructions have not been configured for this conference yet.';

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <span aria-hidden="true" className="text-lg">
            ₹
          </span>
        </div>

        <div>
          <h3 className="font-semibold">Manual payment</h3>
          <p className="text-xs text-muted-foreground">
            Payment instructions and verification
          </p>
        </div>
      </div>

      <div className="w-full min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
        {formatInstructions(text)}
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        Submit your transaction reference and payment proof after completing
        a valid payment. Your registration remains pending until the organizer
        verifies the payment.
      </p>
    </section>
  );
}