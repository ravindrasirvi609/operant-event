# Worker Phase 0 — BullMQ Foundation

**Spec:** SRS §31 (Error Handling and Resilience), §32 (Observability),
§14/§18/§20/§38 ("asynchronous by design for heavy work: emails, PDFs,
exports and large imports must use background jobs").

**Depends on:** nothing product-specific — this is the shared plumbing
every later worker plan builds its processor on.

**Goal:** `apps/worker` stops being "connects to Redis and logs 'no
queues registered yet'" and becomes a real BullMQ runtime: one
`Worker` per queue, shared retry/backoff conventions, graceful shutdown,
and a place to actually see what's failing — before any specific
processor exists.

**Exit condition:** a trivial smoke-test job, added and removed by this
phase, proves a job round-trips through Redis, runs, and its completion
is observable, using the exact conventions every later processor reuses.

---

## Current status

`apps/worker/src/main.ts` connects to `ioredis` and exits cleanly on
`SIGINT`/`SIGTERM` — nothing else. `bullmq`, `ioredis`, `@prisma/client`
are already dependencies. No `Queue`, `Worker`, `QueueEvents`, or
`Processor` exists anywhere in the codebase yet — confirmed by grep
across `apps/api/src` and `apps/worker/src`. The producer side already
exists and is real: `apps/api` really adds jobs to three queues today —
`email` (`EmailQueueService`), `exports` (`ExportQueueService`),
`imports` (`ImportQueueService`) — they just have nothing on the other
end consuming them yet.

## Architecture decisions

### Queue/connection conventions

- **One shared Redis connection factory**, not one `new Redis(...)` per
  queue — `apps/worker/src/redis-connection.ts` exports a function
  building an `ioredis` client with `maxRetriesPerRequest: null` (BullMQ's
  documented requirement for blocking commands) reused by every `Queue`/
  `Worker`/`QueueEvents` instance in the process, mirroring the one
  connection `main.ts` already opens.
- **Queue names are string constants exported once**, not repeated
  string literals — `apps/worker/src/queue-names.ts`:
  ```ts
  export const QUEUE_NAMES = {
    EMAIL: 'email',
    EXPORTS: 'exports',
    IMPORTS: 'imports',
    INVOICE_PDF: 'invoice-pdf',      // new, see worker/04
    CERTIFICATE_PDF: 'certificate-pdf', // new, see worker/05
    REVIEW_SCHEDULER: 'review-scheduler', // new, see worker/03
    CONFERENCE_REMINDER: 'conference-reminder', // new, see worker/06
  } as const;
  ```
  This file must stay the single source of truth on **both** sides —
  `apps/api`'s `EMAIL_QUEUE`/`EXPORT_QUEUE`/`IMPORT_QUEUE` constants
  (currently each declared locally next to their `EmailQueueService`/
  `ExportQueueService`/`ImportQueueService`) should import the literal
  value from a shared location. Since there's no shared package between
  `apps/api` and `apps/worker` yet (see Frontend Phase 0's same
  "Explicitly deferred" note about `packages/types`), the pragmatic
  choice for now is: **the string values must match exactly** and this
  file documents them; a `packages/queue-contracts` package is a
  reasonable follow-up once a third consumer needs the same names, not
  before.
- **Default job options**, applied via each `Worker`'s constructor
  options rather than repeated per `queue.add()` call:
  ```ts
  export const DEFAULT_WORKER_OPTIONS = {
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 }, // keep failures longer for the dead-letter inspection SRS §32 asks for
  };
  export const DEFAULT_RETRY_OPTIONS = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
  };
  ```
  SRS §31: "Retry transient external-provider errors with controlled
  backoff... Do not retry non-idempotent operations without an
  idempotency strategy." Every processor plan below states explicitly
  whether its job is safely retryable as-is (most are, because the
  producer side already writes an idempotent row first — e.g.
  `WebhookEvent`'s unique constraint) or needs its own guard.

### Observability (SRS §32)

- Every `Worker` gets a matching `QueueEvents` listener logging
  `completed`/`failed`/`stalled` with the job id and queue name as
  structured fields (JSON console output — matching whatever
  `apps/api`'s existing logging looks like; check for a shared logger
  convention before inventing a new one).
- A dead-letter inspection path: jobs that exhaust `attempts` stay in the
  queue's failed set (via `removeOnFail: { count: 5000 }` above, not
  `removeOnFail: true`) so they're inspectable rather than silently
  gone. Actually *acting* on them (a dashboard, an alert) is explicitly
  deferred below.
- Health: `apps/worker` doesn't serve HTTP today. SRS §32 asks for
  "health endpoints for API and dependency readiness" — for the worker,
  the pragmatic equivalent this phase adds is a periodic self-check
  (log a heartbeat line every N minutes with queue depth per queue via
  `queue.getJobCounts()`) rather than standing up an HTTP server whose
  only purpose would be a `/health` route nothing calls yet.

### Graceful shutdown

`main.ts`'s existing `SIGINT`/`SIGTERM` handler is extended to call
`.close()` on every registered `Worker` (which waits for in-flight jobs
to finish or hit their lock timeout) before quitting the shared Redis
connection — a bare `process.exit()` today would kill an in-flight job
mid-processing on every deploy.

## File structure

```
apps/worker/src/
  main.ts                    # boots the shared connection, registers every Worker, wires shutdown
  redis-connection.ts
  queue-names.ts
  job-defaults.ts            # DEFAULT_WORKER_OPTIONS / DEFAULT_RETRY_OPTIONS
  logger.ts                  # structured logging helper shared by every processor
  processors/                # one file per queue, added by the phase that needs it
```

---

## Tasks

### Task 1: Shared connection, constants, defaults, logger

**Files:**
- Create: `apps/worker/src/redis-connection.ts`
- Create: `apps/worker/src/queue-names.ts`
- Create: `apps/worker/src/job-defaults.ts`
- Create: `apps/worker/src/logger.ts`

- [ ] `redis-connection.ts` exports `createRedisConnection(env: Env): Redis`
  — same `maxRetriesPerRequest: null` options `main.ts` already uses,
  factored out so every `Queue`/`Worker` constructor takes the same
  instance (BullMQ recommends one connection per process where
  practical, not one per queue).
- [ ] `logger.ts`: a minimal structured logger (`log(level, message, fields)`
  → JSON line to stdout) — no need for a full logging library at this
  scale; matches SRS §32's "structured server logs" without over-building.

### Task 2: `main.ts` becomes a real BullMQ host

**Files:**
- Modify: `apps/worker/src/main.ts`

- [ ] Replace the "worker ready — no queues registered yet" log with a
  `registerWorker(queueName, processor, options)` helper that creates a
  `Worker` + matching `QueueEvents`, wires the observability logging from
  above, and pushes both onto an array closed on shutdown.
- [ ] For this phase, register exactly one throwaway processor
  (`QUEUE_NAMES.EMAIL` is a fine placeholder target since worker/06 will
  replace it) that just logs the job payload and resolves — proves the
  wiring, deleted once a later phase's real processor replaces it.
- [ ] Extend the shutdown handler to `await Promise.all(workers.map(w => w.close()))`
  before `redis.quit()`.

### Task 3: Smoke test

**Files:**
- Create: `apps/worker/src/main.smoke.spec.ts` (or a manual verification
  script — `apps/worker` has no test runner installed yet either; adding
  one just for this one smoke check may not be worth it compared to a
  documented manual verification step, decide based on how much test
  infra this package ends up needing once worker/03–06 land)

- [ ] From `apps/api` (or a one-off script), `queue.add('smoke', {ts: Date.now()})`
  against the placeholder queue from Task 2, confirm the worker process
  logs receipt and completion within a few seconds against the real
  `docker compose` Redis.

---

## Definition of Done

- [ ] `apps/worker` boots, connects, and registers at least one real
  `Worker` (not just an idle Redis client).
- [ ] A job added from a separate process (`apps/api` or a script) is
  picked up, processed, and its completion is visible in worker logs.
- [ ] Killing the worker process (`SIGTERM`) while a job is mid-run does
  not silently drop it — either it completes first or logs a stall the
  next run picks up.
- [ ] `DEFAULT_RETRY_OPTIONS`/`DEFAULT_WORKER_OPTIONS` are the single
  place every later processor's options come from — no per-processor
  ad hoc `attempts: 3` scattered around.

## Explicitly deferred

- Bull Board (or equivalent web UI for queue inspection) — genuinely
  useful for SRS §32's "queue dead-letter/error inspection process," but
  it's an additional HTTP surface with its own auth question (who can
  see job payloads, which may contain PII); revisit once there's more
  than one real processor to make inspecting worthwhile.
- Repeatable/scheduled jobs via BullMQ's Job Scheduler API
  (`queue.upsertJobScheduler(...)`, the current API in the installed
  `bullmq@6.2.0` — the older `repeat` option on `queue.add()` is
  deprecated) — used starting in `worker/03-review-scheduler.md`, not
  here, since this phase has no recurring job yet.
- Metrics export (Prometheus/OpenTelemetry) — SRS §32 mentions "metrics
  for... queue backlog... job failures" generally; the heartbeat log
  line above is the pragmatic interim, not a real metrics pipeline.
