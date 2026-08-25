# Phase 4 — Registration, Pricing, Payment, Invoice

**Spec:** SRS §13 (Registration Management), §14 (Payment, Orders and
Invoicing).

**Depends on:** Phase 1 (`Conference`, `User`), Phase 3 (an accepted
abstract can imply an "Author" registration category, but registration
itself does not require an abstract — most attendees have none).

**Goal:** an attendee registers under a priced category, pays through a
provider, and only a verified webhook — never a client callback — confirms
the registration; every historical order preserves the price it was
actually charged, even if pricing later changes.

**Exit condition (SRS §39):** *Paid registration is reliable and
auditable.*

**Requirement IDs covered:** `REG-001`…`REG-006`, `PAY-001`…`PAY-006`.

---

## Data model

```prisma
enum RegistrationStatus { PENDING CONFIRMED CANCELLED REFUNDED CHECKED_IN }
enum OrderStatus { PENDING PAID FAILED CANCELLED PARTIALLY_REFUNDED REFUNDED }
enum PaymentStatus { INITIATED PENDING SUCCESS FAILED CANCELLED REFUNDED }

model RegistrationCategory {
  id           String @id @default(cuid())
  conferenceId String
  name         String       // Student, Faculty, Delegate, Speaker, VIP, Exhibitor
  description  String?
  conference   Conference @relation(fields: [conferenceId], references: [id])
  types        RegistrationType[]
  @@index([conferenceId])
}

model RegistrationType {
  id         String @id @default(cuid())
  categoryId String
  name       String   // "Early Bird", "Regular", "Late"
  price      Decimal  @db.Decimal(10, 2)
  currency   String
  startDate  DateTime
  endDate    DateTime
  capacity   Int?
  category   RegistrationCategory @relation(fields: [categoryId], references: [id])
  registrations Registration[]
  @@index([categoryId, startDate, endDate])
}

model Registration {
  id                  String  @id @default(cuid())
  conferenceId        String
  registrationNumber  String
  userId              String
  registrationTypeId  String
  status              RegistrationStatus @default(PENDING)
  totalAmount         Decimal @db.Decimal(10, 2)
  currency            String
  registeredAt        DateTime @default(now())
  conference          Conference @relation(fields: [conferenceId], references: [id])
  registrationType    RegistrationType @relation(fields: [registrationTypeId], references: [id])
  order                Order?
  @@unique([conferenceId, registrationNumber])
  @@index([conferenceId, status])
}

model Order {
  id             String @id @default(cuid())
  conferenceId   String
  registrationId String @unique
  orderNumber    String
  subtotal       Decimal @db.Decimal(10, 2)
  discount       Decimal @db.Decimal(10, 2) @default(0)
  tax            Decimal @db.Decimal(10, 2) @default(0)
  total          Decimal @db.Decimal(10, 2)
  currency       String
  status         OrderStatus @default(PENDING)
  registration   Registration @relation(fields: [registrationId], references: [id])
  items          OrderItem[]
  payments       Payment[]
  invoice        Invoice?
  @@unique([conferenceId, orderNumber])
  @@index([conferenceId, status])
}

model OrderItem {
  id           String @id @default(cuid())
  orderId      String
  itemType     String  // REGISTRATION | ADDON
  referenceId  String? // e.g. RegistrationType.id or a future add-on id
  description  String
  quantity     Int     @default(1)
  unitPrice    Decimal @db.Decimal(10, 2)
  totalPrice   Decimal @db.Decimal(10, 2)
  order        Order @relation(fields: [orderId], references: [id])
}

model Payment {
  id                  String @id @default(cuid())
  orderId             String
  provider             String  // razorpay | stripe
  providerOrderId      String?
  providerPaymentId    String? @unique
  amount               Decimal @db.Decimal(10, 2)
  currency             String
  status               PaymentStatus @default(INITIATED)
  paidAt               DateTime?
  order                Order @relation(fields: [orderId], references: [id])
  @@index([orderId])
  @@index([providerPaymentId])
}

model WebhookEvent {
  id           String @id @default(cuid())
  provider     String
  eventId      String  // provider's own event/idempotency id
  payloadHash  String
  processedAt  DateTime?
  createdAt    DateTime @default(now())
  @@unique([provider, eventId])
}

model Invoice {
  id              String @id @default(cuid())
  invoiceNumber   String @unique
  orderId         String @unique
  subtotal        Decimal @db.Decimal(10, 2)
  discount        Decimal @db.Decimal(10, 2)
  tax             Decimal @db.Decimal(10, 2)
  total           Decimal @db.Decimal(10, 2)
  documentFileId  String?
  order           Order @relation(fields: [orderId], references: [id])
  issuedAt        DateTime @default(now())
}
```

`WebhookEvent` is new relative to the SRS's own table list (§27.2 doesn't
name it) but is required to satisfy `PAY-002` ("duplicate webhook does
not duplicate payment state") — the unique `(provider, eventId)`
constraint is the actual idempotency mechanism, not a best-effort check
in application code.

## Payment flow (SRS §14, verbatim sequence)

```
Registration -> Create Order -> Create Provider Payment/Checkout
  -> Customer Pays -> Provider Webhook -> Verify Signature
  -> Record Payment -> Mark Order Paid -> Confirm Registration
  -> Queue Invoice + Confirmation Email
```

Implemented as: `POST /orders` creates `Order`+`OrderItem[]` (server
computes price from the *currently effective* `RegistrationType` window —
client never sends a price) and calls the provider adapter to create a
checkout session. The client only ever receives a checkout
URL/token — order/registration stay `PENDING` regardless of what the
client reports afterward. Only
`POST /payments/webhooks/:provider` can transition `Payment`→`SUCCESS`,
`Order`→`PAID`, `Registration`→`CONFIRMED`, inside one DB transaction,
after signature verification and the `WebhookEvent` idempotency insert
succeed.

## Provider abstraction (PAY-001)

```
payments/
  providers/payment-provider.interface.ts
    createCheckout(order): { checkoutUrl, providerOrderId }
    verifyWebhookSignature(rawBody, headers): boolean
    parseWebhookEvent(rawBody): { eventId, providerPaymentId, status, amount }
  providers/razorpay.provider.ts
  providers/stripe.provider.ts   # stub until PAY provider decision (SRS §42.3) is finalized
```

Domain services (`OrdersService`, webhook handler) depend only on
`PaymentProvider`, never on `razorpay`/`stripe` SDK types — satisfies
PAY-001's acceptance criterion directly.

## API surface

| Method & path | Purpose |
|---|---|
| `GET /api/v1/conferences/:id/registration-categories` | list categories |
| `POST /api/v1/conferences/:id/registration-categories` | create category |
| `POST /api/v1/registration-categories/:id/types` | pricing window (Early Bird/Regular/Late) |
| `PATCH /api/v1/registration-types/:id` | edit price/dates/capacity |
| `POST /api/v1/conferences/:id/registrations` | REG-001 attendee registers |
| `GET /api/v1/registrations/:id` | detail |
| `GET /api/v1/conferences/:id/registrations` | organizer list |
| `PATCH /api/v1/registrations/:id` | REG-005 amend participant details |
| `POST /api/v1/registrations/:id/cancel` | REG-006 |
| `POST /api/v1/orders` | REG-002 create order + provider checkout for a pending registration |
| `GET /api/v1/orders/:id` | detail incl. `OrderItem[]` price snapshot |
| `POST /api/v1/payments/webhooks/:provider` | PAY-002 provider webhook, signature-verified, idempotent |
| `GET /api/v1/invoices/:id` | PAY-005 |
| `POST /api/v1/orders/:id/refund` | PAY-006 |

## Module & file structure (`apps/api/src/`)

```
registration-categories/   .module.ts .controller.ts .service.ts
registration-types/        .module.ts .controller.ts .service.ts
  pricing.service.ts        # resolves the effective RegistrationType for "now"
registrations/             .module.ts .controller.ts .service.ts
orders/                    .module.ts .controller.ts .service.ts
payments/
  payments.module.ts payments.controller.ts payments.service.ts
  providers/  (as above)
  webhook-idempotency.service.ts
invoices/                  .module.ts .controller.ts .service.ts
  invoice-pdf.processor.ts   # BullMQ processor in apps/worker
```

`apps/web/app/`:

```
conferences/[id]/registrations/     # organizer: list, filters, manual amendments
conferences/[id]/pricing/           # organizer: categories + pricing windows
registration/[conferenceId]/        # public/attendee: checkout flow
registration/[conferenceId]/success/
```

## Business rules

- **REG-002**: price calculation happens exactly once, server-side, at
  order creation, and is stored on `OrderItem` — never recomputed from
  `RegistrationType` after the fact (PAY-003: "historical total remains
  reproducible" even if the category's price changes next month).
- **REG-003**: `RegistrationType.capacity` is enforced with a row lock /
  count check inside the same transaction that creates the `Order`, to
  avoid overselling under concurrent checkouts.
- **REG-004**: `Registration.status` only becomes `CONFIRMED` from the
  webhook path described above — there is no other code path that sets
  it, including no "mark as paid" admin shortcut in this phase (a manual
  override, if ever needed, is a separate audited action, not a
  reachable side effect of a normal API call).
- **REG-006 / PAY-006**: cancellation creates a `Refund`-tracking update
  on `Payment.status` (`REFUNDED`) and `Order.status`
  (`REFUNDED`/`PARTIALLY_REFUNDED`); refunds are recorded, not just
  status flips — `Payment` keeps the original `providerPaymentId` so a
  refund is always traceable to the exact transaction it reverses.
- **PAY-005**: `Invoice` generation is a queued `apps/worker` job
  triggered right after `Order`→`PAID`, producing a PDF stored via the
  `File`/`files` module from Phase 1 and referenced by
  `Invoice.documentFileId`.

## Testing focus

- Unit: pricing-window resolution at arbitrary "now" timestamps
  (including the exact boundary between Early Bird and Regular);
  capacity-exhaustion rejection.
- Integration: webhook replay with the same `eventId` never double-charges
  or double-confirms (assert `Order`/`Registration` state is identical
  after 1 and after 5 deliveries of the same event).
- Security: an unsigned or badly-signed webhook payload is rejected
  before touching any domain state.
- Load (SRS §34, "Load" row): registration + webhook endpoints under
  concurrent load, specifically around capacity-limited categories.

## Definition of Done

- [ ] All `REG-*`/`PAY-*` requirements pass their stated acceptance
  criteria.
- [ ] Webhook idempotency is proven by a replay test, not just code
  inspection (SRS §34.1 release blocker).
- [ ] No code path outside the verified webhook handler can set
  `Registration.status = CONFIRMED`.
- [ ] Invoice numbers are unique and PDFs are retrievable after
  generation.
