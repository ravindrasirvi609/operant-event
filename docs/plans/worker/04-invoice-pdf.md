# Worker Phase 4 — Invoice PDF Rendering

**Spec:** SRS §14 (invoice generation), §31 ("PDFs... must use background
jobs").

**Depends on:** `worker/00-foundation.md`. Backend Phase 4
(`InvoicesService.generateForOrder` — already creates the `Invoice` row
with real numbers/totals; `documentFileId` is always `null` today,
exactly the gap this phase closes). Backend Phase 6's `FilesService`
(for storing the rendered PDF and getting back a `fileId`).

**Goal:** every `Invoice` row eventually gets a real PDF behind
`documentFileId`, generated asynchronously so `OrdersService`/
`PaymentsService`'s request path never blocks on PDF rendering.

**Exit condition:** a paid order's invoice has a downloadable PDF within
seconds of payment confirmation, without `PaymentsService.confirmOrderPaid`
(the synchronous request path) taking any longer than it does today.

---

## Backend change required first (small, producer-side)

`InvoicesService.generateForOrder` needs one addition: after creating the
`Invoice` row, enqueue a job onto `QUEUE_NAMES.INVOICE_PDF` with
`{ invoiceId }`. This is a genuinely small change (mirrors the existing
`EmailQueueService`/`ExportQueueService` pattern exactly — inject an
`@InjectQueue('invoice-pdf') queue: Queue`, `queue.add('render-invoice-pdf', { invoiceId })`)
and should be done via the same TDD discipline as every other producer
call this session: a test asserting the queue gets the right job, then
the implementation. It is *not* optional plumbing this plan can skip
past — without it, the worker has nothing to consume no matter how good
the processor is.

## Job payload & processor contract

- Job name: `render-invoice-pdf`. Payload: `{ invoiceId: string }`.
- Processor:
  1. Load the `Invoice` + related `Order`/`Registration`/`User`/
     `Conference` (everything needed for a real invoice document: payer
     name, conference name/dates, line items, totals, invoice number).
  2. **Idempotency guard**: if `Invoice.documentFileId` is already set,
     no-op and resolve — a retried or duplicate job must never generate
     a second file and silently orphan the first (SRS §31: "do not
     retry non-idempotent operations without an idempotency strategy" —
     this guard *is* the strategy).
  3. Render a PDF. Library choice is an implementation-time decision,
     not pinned here — `pdfkit` (imperative, full control, no HTML/CSS)
     and `@react-pdf/renderer` (JSX-based, easier to keep visually
     consistent with the eventual certificate template from
     `worker/05-certificate-pdf.md` if both use the same approach) are
     the two realistic candidates; pick one and use it for both PDF
     processors so there's only one rendering toolchain to maintain.
  4. Upload the rendered buffer through the same path
     `FilesController.upload` uses server-side (call `FilesService`
     directly if the worker can depend on it, or replicate the storage
     write — decide based on whether `FilesService`'s actual storage
     backend, confirmed during implementation, is something the worker
     process can reach directly, e.g. local disk/shared volume vs.
     something requiring the Nest app's DI context).
  5. `prisma.invoice.update({ where: { id: invoiceId }, data: { documentFileId } })`.

## Testing focus

- Unit: the idempotency guard (job runs twice with a payload for an
  invoice that already has `documentFileId` set → second run makes no
  storage write, no DB write).
- Integration: full loop — pay an order → `Invoice` created →
  `render-invoice-pdf` job fires → `documentFileId` populated →
  `InvoicesController`'s owner/organizer `GET` routes both reflect it →
  Phase 4 frontend's `<InvoiceView>` shows a real download link instead
  of the "document pending" state.

## Definition of Done

- [ ] `InvoicesService.generateForOrder` enqueues the job (backend
  change, tested).
- [ ] The processor is idempotent under a duplicate/retried job.
- [ ] A rendered PDF contains the invoice number, order total, and payer
  name at minimum — exact layout is not spec'd, correctness of the
  numbers on it is.
- [ ] `docs/plans/frontend/04-registration-payments.md`'s
  `<InvoiceView>` "document pending" fallback is exercised in a test
  showing it disappears once this job completes.

## Explicitly deferred

- Custom invoice branding/letterhead per organization — no backend field
  for a logo/letterhead exists on `Organization` today; ships with a
  plain, correct layout first.
- Invoice re-issuance/correction workflow — out of scope; invoices are
  generated once per paid order today, matching the backend's current
  `@@unique` constraint on `orderId`.
