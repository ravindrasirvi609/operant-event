import type { Invoice } from '@/lib/registrations/types';

/**
 * `Invoice.documentFileId` is always `null` today — PDF rendering is a
 * backend-deferred item (see `docs/plans/worker/04-invoice-pdf.md`) — so
 * this always shows the line items plus a "not yet available" state
 * rather than a broken download link.
 */
export function InvoiceView({ invoice }: { invoice: Invoice | null }) {
  if (!invoice) {
    return <p className="text-sm text-muted-foreground">No invoice has been issued for this order yet.</p>;
  }

  return (
    <div className="max-w-sm space-y-3 rounded-lg border p-4 text-sm">
      <h3 className="font-semibold">Invoice {invoice.invoiceNumber}</h3>
      <dl className="grid grid-cols-2 gap-1">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd>{invoice.subtotal}</dd>
        <dt className="text-muted-foreground">Discount</dt>
        <dd>{invoice.discount}</dd>
        <dt className="text-muted-foreground">Tax</dt>
        <dd>{invoice.tax}</dd>
        <dt className="text-muted-foreground">Total</dt>
        <dd className="font-semibold">{invoice.total}</dd>
        <dt className="text-muted-foreground">Issued</dt>
        <dd>{new Date(invoice.issuedAt).toLocaleDateString()}</dd>
      </dl>
      {invoice.documentFileId ? (
        <p className="text-xs text-muted-foreground">PDF available.</p>
      ) : (
        <p className="text-xs text-muted-foreground">PDF not yet available.</p>
      )}
    </div>
  );
}
