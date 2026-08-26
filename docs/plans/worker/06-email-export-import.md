# Worker Phase 6 — Email Delivery, Exports, Imports, Conference Reminders

**Spec:** SRS §20 (Communications and Notifications), §22 (Reporting),
§38 (Data Migration and Import/Export), §31, §32.

**Depends on:** `worker/00-foundation.md`. Backend Phase 6 — all three
producer sides are real and already enqueue jobs today:
`EmailQueueService` → `email` queue, `ExportsService` → `exports` queue,
`ImportsService` → `imports` queue. Nothing consumes any of them yet.

**Goal:** the three queues Phase 6 built the producer side for get real
consumers, plus the one repeatable job §20's trigger table names but
Phase 6 never got to: `conference.reminder`.

**Exit condition:** an end-to-end loop — an event fires in `apps/api`
(e.g. `abstract.accepted`) → a real email is delivered (or, in dev,
logged with full fidelity) → an export request reaches `DONE` with a
downloadable file → an import request reaches `DONE`/`FAILED` with a
row-level error report when applicable.

---

## 1. Email delivery (`email` queue)

### Mailer provider abstraction — and a debt this phase should pay off

`apps/api/src/auth/auth-mailer.interface.ts` already established this
exact pattern for auth emails (verify-email, password-reset) back in
backend Phase 1, with a comment stating outright: *"AUTH_MAILER is a
stopgap ConsoleAuthMailer until Phase 6 builds the real templated
notification pipeline... swap the provider bound to AUTH_MAILER then,
nothing in AuthService changes."* Phase 6 built the pipeline
(`NotificationEventsListener` → `EmailQueueService` → the `email` queue)
but never actually swapped `AUTH_MAILER`'s binding — it's still
`ConsoleAuthMailer`, logging instead of sending, and auth emails still
bypass the templated-notification path entirely (they're not driven by
an `EmailTemplate` row or the `TemplateRendererService`). This worker
phase is where that gets resolved, not silently left as two unrelated
email paths:

- Define `MailerProvider` (worker-side, since sending is what the
  worker does): `send(to: string, subject: string, html: string): Promise<void>`.
- `ConsoleMailerProvider` (dev default — logs full content, doesn't
  send) and a real provider — **Resend** is the natural choice given
  it's already available tooling in this environment (see the
  `resend:*` skills) and its API is a single authenticated POST, no SMTP
  session management to build. `ResendMailerProvider` wraps it.
- The `email` queue's processor (`send-email` jobs from
  `EmailQueueService.enqueue`) calls whichever `MailerProvider` is
  configured via env (`MAILER_PROVIDER=console|resend`, mirroring the
  `PaymentProvider` map pattern already used for Razorpay/Stripe).
- **Follow-up recorded, not done in this phase**: once a real
  `MailerProvider` exists, revisit `AUTH_MAILER` in `apps/api` — either
  (a) have `AuthService` emit its own notification events
  (`auth.email_verification_requested`, `auth.password_reset_requested`)
  through the *same* `NotificationEventsListener`/`EmailQueueService`
  path everything else uses, retiring `ConsoleAuthMailer` entirely and
  finally keeping the promise in that file's own comment, or (b) at
  minimum point `ConsoleAuthMailer`'s production replacement at the same
  `MailerProvider` this phase builds, so there's one real sending
  implementation even if two call paths remain. Prefer (a) — it's a
  small, well-scoped backend change (two new `emit()` calls, matching
  the retrofit pattern already used for the other eight `§20` triggers)
  and it's the only way "the real templated notification pipeline"
  claim in that 2-phases-old comment becomes actually true.

### Job payload & processor contract

- Job name: `send-email`. Payload (from `EmailQueueService`, already
  fixed): `{ to: string, subject: string, body: string }`.
- Processor: `mailerProvider.send(to, subject, body)`. `body` is
  already-rendered HTML/text from `TemplateRendererService` — the
  worker does no template logic itself, matching Phase 6's design
  (rendering happens in `apps/api`, before the job is even enqueued).
- Retryable as-is: sending the same email twice on a retry is not
  strictly idempotent (a user could get a duplicate email), but it's
  low-harm compared to most retry-safety concerns in this system — no
  extra guard needed. If a provider gives back a permanent failure
  (invalid address), don't retry `DEFAULT_RETRY_OPTIONS`'s full 5
  attempts against a permanent failure — the processor should
  distinguish 4xx-style provider errors (fail fast, no retry) from
  5xx/network errors (retry per defaults), matching SRS §31's
  "retry transient... errors" framing.

## 2. Exports (`exports` queue)

### Job payload & processor contract

- Job name: `run-export`. Payload (from `ExportQueueService`): `{ exportJobId: string }`.
- Processor:
  1. Load the `ExportJob`, flip `status: 'RUNNING'`.
  2. Dispatch on `type` (`ABSTRACTS | REGISTRATIONS | PAYMENTS |
     AUDIT_LOG`) to one query per type, scoped by `organizationId` and,
     if set, `conferenceId` — **reuses the exact same tenant-scoping
     discipline as the Phase 6 report dashboards** (`ReportsService`'s
     `assertConferenceInOrganization`-style guard); an export job's
     `organizationId`/`conferenceId` were already validated at request
     time (`ExportsService.create`), so the processor trusts the stored
     row, not a fresh client input.
  3. Serialize to CSV (or XLSX — SRS §38 says "CSV import," §22's export
     language doesn't mandate a format; CSV is the simpler, more
     universally-consumable default, add XLSX only if a concrete need
     shows up) with a schema/version marker as the first row or a
     sidecar field (SRS §38: "Exports should include a schema/version
     marker where practical").
  4. Upload the result through the same storage path
     `worker/04-invoice-pdf.md` uses for PDFs, get back a `fileId`.
  5. `prisma.exportJob.update({ data: { status: 'DONE', resultFileId, completedAt: new Date() } })`.
  6. On any failure: `status: 'FAILED', error: <message>` — never leave
     a job stuck in `RUNNING` if the processor throws; wrap the whole
     body in try/catch that writes the failure state before rethrowing
     (so BullMQ's own retry still happens, but the row always reflects
     current reality for anyone polling `GET exports/:id`).

## 3. Imports (`imports` queue)

### Job payload & processor contract

- Job name: `run-import`. Payload (from `ImportQueueService`): `{ importJobId: string }`.
- Processor:
  1. Load the `ImportJob` (`type` ∈ `AUTHORS | REVIEWERS | REGISTRATIONS`,
     `sourceFileId` already validated to belong to the organization at
     request time), flip `status: 'RUNNING'`.
  2. Stream-parse the CSV (a streaming parser, not "load the whole file
     into memory," per SRS §38's "large files" framing and §31's
     resource-safety concerns).
  3. Per-row validation dispatches on `type`:
     - `AUTHORS`: shape matches `AuthorInputDto` (Phase 2) — reuse the
       exact same field set/validation rules the API already enforces
       for `set-authors`, don't invent parallel rules a human import can
       satisfy that the UI-driven path would reject.
     - `REVIEWERS`: matches `AddReviewerDto`/`UpdateReviewerProfileDto`
       shape (Phase 3).
     - `REGISTRATIONS`: matches `RegisterDto` plus enough identity info
       (email) to resolve or create a `User` — this is the one import
       type that's genuinely more complex than "insert a row," since a
       registration needs a real user, category, and pricing resolution;
       flag during implementation whether pre-existing registrations
       (the SRS's "registrations where approved" language implies
       importing *existing* paid registrations, not creating new
       chargeable ones) need a distinct code path from a normal
       `RegistrationsService.register` call, since that path prices
       against the *current* effective pricing window, which is wrong
       for backfilling historical data.
  4. Every row failure is collected as `{ row: number, error: string }`,
     not just a running failure count — SRS §38: "row-level errors and a
     downloadable error report."
  5. On completion: `rowsProcessed`, `rowsFailed` set from the real
     counts; if `rowsFailed > 0`, generate a CSV error report (row
     number + original row data + error message) and upload it, setting
     `errorReportFileId`; `status: 'DONE'` even with partial failures
     (SRS §38: "generated even on partial success") — `FAILED` is
     reserved for the import not running at all (e.g. the source file
     couldn't be parsed as CSV), not for "some rows were invalid."

## 4. `conference.reminder` (new repeatable job)

Phase 6's own plan named this explicitly: *"Event reminder (scheduled) |
`conference.reminder` (new job, this phase)"* — but no scheduler exists
for it anywhere yet (same gap class as `review.due` in `worker/03`).

- Queue: reuse `QUEUE_NAMES.CONFERENCE_REMINDER`. Job Scheduler,
  `{ pattern: '0 9 * * *' }` (daily at 09:00 — tune later).
- Processor: find conferences whose start date is exactly N days out (a
  configurable reminder window, e.g. 7 days and 1 day — two thresholds
  is more useful than one and matches how most event platforms remind
  attendees) with `status: 'PUBLISHED'`, and for each `CONFIRMED`
  registration on that conference, emit `conference.reminder` the same
  way `worker/03`'s `review.due` does — through a small internal
  `apps/api` endpoint the worker calls, keeping template
  resolution/rendering in the one place that already owns it (see
  `worker/03-review-scheduler.md`'s recommendation, applied identically
  here — **build the internal-emit endpoint once, shared by both
  `review.due` and `conference.reminder`**, not duplicated per job).

## Testing focus

- Unit: mailer provider dispatch (console vs. resend, selected by env);
  export/import processors' failure-path always writes `FAILED`/row
  errors rather than leaving `RUNNING` on an unhandled throw.
- Integration: full producer→consumer loop for all three existing
  queues, seeded fixture data, asserting the exact `ExportJob`/
  `ImportJob` end states and file contents (row counts, not just "a file
  exists").
- E2E-adjacent (ties back to `docs/plans/frontend/06-...md`): the
  frontend's `<JobStatusPoller>` against a real running worker, not a
  mocked response — this is the one frontend E2E flow that can't be
  fully exercised until this worker phase exists.

## Definition of Done

- [ ] Every `§20` trigger row results in a real delivered (or, in dev,
  fully-logged) email — not just an enqueued job, per the phase 6
  backend plan's own Definition of Done, now actually closed out.
- [ ] `AUTH_MAILER`'s relationship to the new `MailerProvider` is
  resolved one way or the other (unified via new `emit()` calls, or
  explicitly re-flagged as intentionally separate with a reason) — not
  left as a stale two-phases-old TODO comment.
- [ ] Export/import jobs never get stuck in `RUNNING` on a processor
  crash.
- [ ] `conference.reminder` fires on the configured schedule against
  seeded fixture conferences at the right date offsets.

## Explicitly deferred

- XLSX export format — CSV only unless a concrete need appears.
- Per-organization reminder-window configuration — one global default
  to start, same reasoning as `worker/03`.
- Retrying a `FAILED` import automatically — a failed import today
  requires a fresh `POST .../imports` call; no "retry this job" endpoint
  exists, and adding one is a reasonable but separate follow-up.
