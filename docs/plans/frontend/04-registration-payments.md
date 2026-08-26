# Frontend Phase 4 — Registration & Payments

**Spec:** SRS §14 (Registration and Payments), §31, §35, §36.

**Depends on:** `frontend/00-foundation.md`. Backend Phase 4
(`RegistrationCategoriesController`, `RegistrationTypesController`,
`RegistrationsController`, `OrdersController`, `PaymentsController`,
`InvoicesController`).

**Goal:** an organizer configures registration categories/pricing
windows; a participant registers, checks out, and pays — through a real
gateway when the conference has one configured, or through a manual
proof-of-payment flow with staff approval when it doesn't — and can
retrieve an invoice once paid.

**Exit condition:** both payment modes (`GATEWAY` and `MANUAL`) work
end-to-end through the UI against the same registration flow, with the
UI never assuming which mode is active until it reads
`ConferenceSetting.paymentMode` (there is no dedicated "get payment mode"
endpoint — read it via the existing settings `GET
conferences/:conferenceId/settings` call already wired in
`frontend/01-...md`).

---

## Route tree

```
app/(dashboard)/
  conferences/[conferenceId]/registration-categories/page.tsx   # organizer
(participant)/
  conferences/[conferenceId]/register/page.tsx     # category/type picker -> RegisterDto
  registrations/[registrationId]/page.tsx          # status + "pay now" entry point
  registrations/[registrationId]/checkout/page.tsx # order creation, branches on paymentMode
  orders/[orderId]/page.tsx                        # order status, invoice link
(dashboard)/
  conferences/[conferenceId]/payments/page.tsx     # organizer: pending manual-payment queue, refunds
```

`(participant)` mirrors the `(author)`/`(reviewer)` pattern from Phases
2–3: `RegistrationsController`, `OrdersController`, and the
`submitManualPaymentProof`/invoice-`findOwned` routes all run
`JwtAuthGuard` only, no org header.

## API surface consumed

| Page/action | Method & path | Notes |
|---|---|---|
| Categories admin | `conferences/:conferenceId/registration-categories[...]` | header, `REGISTRATION_MANAGE`; `CreateRegistrationCategoryDto { name, description? }` |
| Pricing windows admin | `POST registration-categories/:categoryId/types` | header, same permission; `CreateRegistrationTypeDto { name, price, currency, startDate, endDate, capacity? }` |
| Register | `POST conferences/:conferenceId/registrations` | `RegisterDto { categoryId }`, no header — **the server resolves price/currency itself from the currently-effective pricing window; the UI must never send a price, and must show the resolved price only after the call succeeds**, not compute one client-side from stale category data |
| My registration | `GET registrations/:id` | no header |
| Create order | `POST registrations/:registrationId/orders` | `CreateOrderDto { provider? }`, no header |
| Manual proof | `POST orders/:orderId/payment-proof` | `SubmitManualPaymentProofDto { reference?, proofFileId? }`, no header |
| Approve manual | `POST orders/:orderId/approve-payment` | header, `PAYMENT_MANAGE` |
| Reject manual | `POST orders/:orderId/reject-payment` | header, `PAYMENT_MANAGE` |
| Refund | `POST orders/:orderId/refund` | header, `PAYMENT_REFUND` — high-impact, typed confirmation |
| Invoice (owner) | `GET orders/:orderId/invoice` | no header |
| Invoice (organizer) | `GET orders/:orderId/invoice/organizer` | header, `PAYMENT_MANAGE` |
| File upload (payment proof) | `POST files` (Phase 0's proxy handles multipart) | header — **note: `FilesController` requires `PermissionsGuard` (an active org membership) even though the participant uploading a proof may have no organization membership at all.** This is a real integration gap: confirm during implementation whether proof uploads need a different, membership-free upload path, or whether participants are expected to already belong to the conference's organization. Do not silently work around it client-side (e.g. by faking a header) — surface it as a blocking backend question before wiring `<PaymentProofUpload>`. |

## Components

- `<RegistrationCategoryPicker>` — lists categories with their *currently
  effective* pricing window (there is no "list effective price" endpoint
  either; render each category's types and let the resolved price from
  the actual `POST .../registrations` response be the source of truth,
  showing the type list beforehand only as an estimate with an explicit
  "price confirmed at registration" caveat).
- `<CheckoutFlow>` — SRS §35: "linear, transparent about price, resilient
  to refresh/back navigation." Concretely: each step's state lives in the
  URL/query or is refetched from the backend (`GET registrations/:id`,
  `GET orders/:orderId`) rather than in a client-only wizard store, so a
  hard refresh mid-checkout resumes from server state, not a blank form.
- `<PaymentModeBranch>` — after `POST .../orders` returns, branches on
  the response shape: `{ order, checkoutUrl }` (gateway — redirect/open
  `checkoutUrl`) vs. `{ order, manualPaymentInstructions: true }`
  (manual — render `<ManualPaymentInstructions>` + `<PaymentProofUpload>`).
  Never branch on `ConferenceSetting.paymentMode` fetched separately for
  this decision — the order-creation response already tells you which
  path happened, and is authoritative even if settings changed between
  page load and checkout.
- `<ManualPaymentInstructions>` — organizer-configured bank
  transfer/cheque instructions; **no backend field currently carries this
  free text** (checked: `ConferenceSetting` has `paymentMode` but no
  instructions text field) — flag this as a Phase-4-backend follow-up
  (`ConferenceSetting.manualPaymentInstructions: String?`) needed before
  this component can render anything beyond "contact the organizer," and
  build the component to accept the text as a prop so it's a one-line
  change once that field exists.
- `<PaymentProofUpload>` — file input (receipt/UTR screenshot) + optional
  reference text, submits `proofFileId` from the Phase-0 files upload
  wrapper, then calls `submitManualPaymentProof`; shows the resulting
  `PENDING` state clearly ("Submitted — awaiting confirmation," not a
  generic "success").
- `<PendingPaymentsQueue>` (organizer) — table of orders with an
  outstanding `MANUAL`/`PENDING` payment claim; approve/reject buttons
  per row, approve uses `<ConfirmDialog>`, reject requires a reason
  (even though `rejectManualPayment` takes no body today — capture the
  reason client-side for the organizer's own record if the backend has
  nowhere to persist it, and flag adding a `reason` field backend-side as
  a nice-to-have, not a blocker).
- `<RefundButton>` — `<ConfirmDialog requireTypedConfirmation="REFUND">`
  per SRS §35's high-impact-action rule.
- `<InvoiceView>` — renders `Invoice` fields (`invoiceNumber`,
  `subtotal`/`discount`/`tax`/`total`); shows a clear "PDF not yet
  available" state when `documentFileId` is null (it always is right
  now — invoice PDF rendering is a backend-deferred item, see
  `docs/plans/worker/04-invoice-pdf.md`) rather than a broken download
  link.

## Business rules (UI-side)

- The order/registration status badges (`PENDING`/`CONFIRMED`/`CANCELLED`/`REFUNDED`
  for registrations; `PENDING`/`PAID`/`REFUNDED` for orders) never imply
  payment success from the *registration* status alone — a `CONFIRMED`
  registration is downstream of a `PAID` order (the backend flips both in
  `confirmOrderPaid`), but the UI polls/refetches the **order**, not just
  the registration, after redirecting back from a gateway checkout, since
  gateway confirmation is webhook-driven and can lag the browser's return
  from the checkout redirect by a few seconds — show a "confirming
  payment…" state with polling (short interval, capped retry count)
  rather than a false failure on the first check.
- Refund and reject-payment are staff-only and never exposed on any
  participant-facing page, even read-only.

## Testing focus

- Unit: `<PaymentModeBranch>` branches purely on response shape, never
  on a separately-fetched settings value (regression test: mock a
  settings value that disagrees with the order response and assert the
  order response wins).
- E2E, gateway path: register → checkout → (mock/sandbox gateway
  redirect) → poll to `PAID` → invoice visible. E2E, manual path:
  register → checkout → upload proof → organizer approves → registrant
  sees `CONFIRMED`/`PAID`.

## Definition of Done

- [ ] Both payment-mode paths verified end-to-end (two separate seeded
  conferences: one `GATEWAY`, one `MANUAL`).
- [ ] Refund requires typed confirmation.
- [ ] A hard refresh at every step of `<CheckoutFlow>` resumes correctly
  from server state.
- [ ] The two flagged backend gaps (manual-payment-instructions field,
  proof-upload's organization-membership requirement) are either
  resolved or explicitly tracked before this phase is marked done — not
  silently designed around.

## Explicitly deferred

- Discount codes / group registration — no `discount` input path exists
  in `RegisterDto`/`CreateOrderDto` today (`Order.discount` is always
  `0` from `OrdersService.create`); out of scope until the backend adds
  it.
- Saved payment methods — gateway-side concern, not modeled here.
