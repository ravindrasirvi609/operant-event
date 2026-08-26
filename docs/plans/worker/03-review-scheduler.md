# Worker Phase 3 — Review Overdue Scheduler

**Spec:** SRS §13 (REV-007: overdue review handling), §20 (`review.due`
trigger row).

**Depends on:** `worker/00-foundation.md`. Backend Phase 3
(`ReviewAssignmentsService.markOverdue`, already implemented and
callable — it just isn't wired to run on a schedule yet). Backend Phase
6's notification pipeline (`NOTIFICATION_EVENTS.REVIEW_DUE`,
`NotificationEventsListener.onReviewDue`) — currently has **no emitter**
anywhere; nothing calls `eventEmitter.emit('review.due', ...)` yet. This
phase is where that gap gets closed, on the worker side rather than
retrofitted into the synchronous request path (there's no HTTP request
for "time has passed," so this can't be an `emit()` call added to an
existing service method the way Phase 6's other five retrofits were).

**Goal:** two related but distinct jobs, both repeatable:
1. Sweep `PENDING`/`IN_PROGRESS` assignments past their `dueDate` to
   `OVERDUE` (the existing `markOverdue()` logic, just scheduled).
2. Separately, notify reviewers whose assignment is approaching or past
   its due date (`review.due` — a reminder, not the same thing as the
   status flip).

**Exit condition:** both jobs run on a real repeating schedule against
the dev database and their effects are visible without a manual
API call ever triggering them.

---

## Queue & scheduler

- Queue: `QUEUE_NAMES.REVIEW_SCHEDULER` (`'review-scheduler'`).
- Two Job Scheduler entries (BullMQ's `queue.upsertJobScheduler`, not
  the deprecated `repeat` option), registered once at worker startup —
  idempotent to call every boot (`upsertJobScheduler` explicitly upserts):
  ```ts
  await queue.upsertJobScheduler(
    'mark-overdue-assignments',
    { every: 15 * 60 * 1000 }, // every 15 minutes
    { name: 'mark-overdue', data: {} },
  );
  await queue.upsertJobScheduler(
    'review-due-reminders',
    { pattern: '0 8 * * *' }, // daily at 08:00 server time
    { name: 'review-due-reminder', data: {} },
  );
  ```
- Both intervals are a starting point, not a hard requirement from the
  SRS (which specifies the behavior, not the cadence) — tune once real
  usage patterns exist; document the chosen values in
  `apps/worker/.env.example` as overridable constants rather than
  hardcoding magic numbers with no explanation.

## Job payload & processor contracts

- `mark-overdue`: no input payload. Processor calls the **existing**
  `ReviewAssignmentsService.markOverdue()` unchanged — this requires
  `apps/worker` to either import `apps/api`'s compiled service (not
  possible today, `apps/worker` has no dependency on `apps/api`'s code,
  by design in a monorepo with separate deployable images) or, more
  realistically, **the query itself is simple enough to duplicate as a
  raw Prisma call in the worker** rather than trying to share a NestJS
  service across process boundaries:
  ```ts
  await prisma.reviewAssignment.updateMany({
    where: { status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  });
  ```
  This is the same logic, just living in the process that actually runs
  on a schedule — decide during implementation whether to extract this
  one-line query into a tiny shared `packages/domain-queries` package or
  accept the duplication given its size; either is defensible, don't
  over-build a package for one query.
- `review-due-reminder`: no input payload. Processor queries assignments
  with `status IN ('PENDING','IN_PROGRESS')` and `dueDate` within a
  configurable reminder window (e.g. due within 48 hours, or already
  overdue and not yet reminded today — decide the exact "don't spam the
  same reviewer daily" rule during implementation and write it down in
  the processor's own comment, since nothing in the SRS specifies it),
  and for each, resolves the assignment's `Reviewer.userId` +
  `organizationId` + abstract title, then adds a job to the `email`
  queue's `NotificationEventsListener` equivalent — **but the listener
  lives in `apps/api`, not the worker.** Two options, pick one during
  implementation and record the choice:
  1. The worker calls `apps/api`'s HTTP surface (a new, internal,
     worker-only authenticated endpoint that just does
     `eventEmitter.emit('review.due', payload)`) — keeps all
     notification-routing logic in one place (`apps/api`), at the cost of
     an HTTP round-trip from a job.
  2. The worker enqueues directly onto the `email` queue itself,
     duplicating the template-resolution logic
     (`EmailTemplatesService.resolve` + `TemplateRendererService.render`)
     that today only exists in `apps/api`.
  **Recommendation: option 1.** It keeps "which email fires for which
  event" logic in exactly one place (already true for the other seven
  `NOTIFICATION_EVENTS` triggers, all emitted from `apps/api`), and the
  worker's job is correctly scoped to "detect time-based conditions,"
  not "know how to render an email."

## Testing focus

- Unit (worker-side, once `apps/worker` has a test runner — see
  `worker/00-foundation.md` Task 3's open question): the overdue-sweep
  query against a small seeded set of assignments with due dates
  straddling "now."
- Integration: run both schedulers against the real dev database with a
  handful of seeded assignments; confirm `OVERDUE` status flips and a
  `review.due` notification lands in the reviewer's `notifications/my`
  inbox (Phase 6 frontend) within one scheduler tick.

## Definition of Done

- [ ] `ReviewAssignmentsService.markOverdue()`'s synchronous callable
  form stays available (organizer-triggered manual "run now," if ever
  exposed) — this phase adds the scheduled trigger, it doesn't remove
  the on-demand one.
- [ ] `review.due` reminders don't re-fire for the same assignment more
  than once within the chosen window.
- [ ] Worker restart doesn't create a duplicate `Job Scheduler` entry
  (`upsertJobScheduler`'s upsert semantics are what make this safe —
  verify with two consecutive worker boots that only one schedule
  exists via `queue.getJobSchedulers()`).

## Explicitly deferred

- Per-conference configurable reminder cadence (some organizers may
  want daily, others weekly) — starts as one global default; a
  per-`ConferenceSetting` override is a reasonable follow-up, not this
  phase's scope.
