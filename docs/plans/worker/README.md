# Operant Event — Worker (BullMQ) Phase Plans

The `apps/worker` counterpart to `docs/plans/*.md`. Unlike the frontend
plan set (one file per backend phase, no exceptions), this set only has
a file for phases that actually introduced asynchronous work — Phases 0
and 1 have none, so there's no `01`/`02` file here and no placeholder
either.

| File | Covers | Depends on |
|---|---|---|
| [00-foundation.md](00-foundation.md) | Shared BullMQ conventions: connection, queue names, retry/backoff defaults, observability, graceful shutdown | Nothing product-specific |
| [03-review-scheduler.md](03-review-scheduler.md) | `mark-overdue` sweep, `review.due` reminders | Backend Phase 3 |
| [04-invoice-pdf.md](04-invoice-pdf.md) | Invoice PDF rendering | Backend Phase 4 |
| [05-certificate-pdf.md](05-certificate-pdf.md) | Certificate PDF rendering, backgrounded eligibility sweep | Backend Phase 5 |
| [06-email-export-import.md](06-email-export-import.md) | Real email delivery, export/import processors, `conference.reminder` | Backend Phase 6 |

## Why this matters more than it might look like

Every backend phase from 3 onward already built a real producer side —
`apps/api` genuinely enqueues jobs onto `email`/`exports`/`imports`
today. None of it does anything yet, because `apps/worker` has never had
a real `Worker` registered against any queue. That gap is bigger than
"add a processor" for two of these plans specifically:

- `worker/03` and `worker/06`'s `conference.reminder` both need a
  **repeatable/scheduled** trigger that doesn't exist from any HTTP
  request at all — there's no request to retrofit an `emit()` call into,
  unlike Phase 6's other five notification triggers, which fired from an
  existing service method. Both plans recommend the same resolution: a
  small internal `apps/api` endpoint the worker calls on its own
  schedule, so template resolution/rendering logic stays in the one
  place that already owns it.
- `worker/06` surfaces a real, standing inconsistency: backend Phase 1
  built `AUTH_MAILER` as an explicitly-labeled stopgap "until Phase 6
  builds the real templated notification pipeline," and Phase 6 built
  that pipeline but never actually swapped the binding — auth emails
  (verify-email, password reset) still bypass it entirely. This plan set
  is where that gets closed, not left as a two-phases-old TODO comment.

## Cross-phase conventions (set in `00-foundation.md`)

- One shared Redis connection per process, not one per queue.
- Queue names, default retry (`attempts: 5`, exponential backoff),
  and default job-retention options live in one file
  (`apps/worker/src/job-defaults.ts`, `queue-names.ts`), imported by
  every processor — never redeclared per processor.
- Every processor states explicitly whether its job is safely retryable
  as written, and if not, what idempotency guard makes it so (matching
  SRS §31: "do not retry non-idempotent operations without an
  idempotency strategy").
- A processor that throws mid-run must never leave its tracked row
  (`ExportJob`/`ImportJob`/etc.) stuck in a non-terminal status —
  write the failure state before rethrowing.
