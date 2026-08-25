# Phase 0 — Foundation

**Spec:** `docs/Operant_Event_Conference_SaaS_SRS.docx` §6 (System Context
and Architecture), §33 (DevOps, Environments and Deployment), §39 (Phase 0
row).

**Goal:** a monorepo where `web`, `api` and `worker` boot locally against
real Postgres/Redis, migrations are repeatable, and CI runs on every push —
with nothing product-specific built yet.

**Exit condition (SRS §39):** *Applications boot locally; DB migration
pipeline works.*

---

## Current status

Most of this phase already exists from the initial scaffolding + structural
cleanup pass. What's done vs. what's left:

**Done**
- pnpm workspace + Turborepo monorepo (`pnpm-workspace.yaml`: `apps/*`,
  `packages/*`; `turbo.json` with `dev`/`build`/`lint`/`typecheck` tasks;
  root `package.json` scripts wired to `turbo run <task>`).
- `apps/web` — Next.js 16 + TypeScript + Tailwind + shadcn/ui, scaffolded.
- `apps/api` — NestJS 11 + TypeScript, scaffolded, with `@nestjs/config`,
  `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `bullmq`,
  `ioredis`, `@prisma/client`/`prisma` already installed.
- `apps/worker` — empty package, not yet a runnable app.
- `infrastructure/docker/docker-compose.yml` — Postgres 17 + Redis 7 for
  local dev.
- `apps/api/.env.example`, root `README.md`.
- Single root `pnpm-lock.yaml` (no nested per-app lockfiles).

**Left for this phase**
- `apps/api/prisma/schema.prisma` is still the empty generated template —
  no models, no migration has ever been run.
- `apps/worker` has no entrypoint, no BullMQ connection, no Dockerfile.
- No `packages/*` exist yet (`ui`, `types`, `validation`, `config`) — SRS
  §6.2 lists them in the target repo layout; create them only when Phase 1
  actually needs to share code (see Task 4 below), not speculatively now.
- No CI pipeline (SRS §33.1: install → lint → typecheck → unit → integration
  → build → migration check → deploy staging → smoke → prod).
- No Dockerfiles for `api`/`worker` production images (SRS §33.1).
- `docker-compose.yml` has never actually been brought up and verified.

---

## Tasks

### Task 1: Verify local infrastructure boots

- [ ] `docker compose -f infrastructure/docker/docker-compose.yml up -d`
- [ ] Confirm Postgres is reachable: `docker exec operant-event-postgres pg_isready -U operant`
- [ ] Confirm Redis is reachable: `docker exec operant-event-redis redis-cli ping` → `PONG`
- [ ] `cp apps/api/.env.example apps/api/.env`

### Task 2: First Prisma migration (empty baseline)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

Add the datasource/generator that's already there plus a placeholder
`Organization` stub is **not** created here — schema content belongs to
Phase 1 (it owns `Organization`/`User`/etc.). This task only proves the
migration pipeline itself works end to end:

- [ ] Add a throwaway model, e.g. `model HealthCheck { id String @id @default(cuid()) createdAt DateTime @default(now()) }`
- [ ] Run `pnpm --filter api exec prisma migrate dev --name init` — confirms `DATABASE_URL`, connection, and migration file generation all work
- [ ] Confirm `apps/api/prisma/migrations/<timestamp>_init/migration.sql` was created and committed
- [ ] Remove the throwaway model and run `prisma migrate dev --name remove-healthcheck` so Phase 1 starts from a clean slate — the point of this task is proving the pipeline, not shipping the stub

### Task 3: `apps/worker` becomes a real app

**Files:**
- Create: `apps/worker/src/main.ts`
- Create: `apps/worker/package.json` (rewrite — currently a placeholder)
- Create: `apps/worker/tsconfig.json`

- [ ] Give `apps/worker` real `dependencies` (`bullmq`, `ioredis`,
  `@prisma/client`, `dotenv`) and `devDependencies` (`typescript`,
  `tsx` or `ts-node`, `@types/node`)
- [ ] Add `dev`/`build`/`start` scripts so it participates in
  `turbo run dev`/`build` like `web` and `api` do
- [ ] `src/main.ts` connects to Redis (`REDIS_URL`) and logs a "worker
  ready" message — no real queues/processors yet, those are added by the
  phase that needs them (first one: Phase 2's file-processing / Phase 4's
  invoice PDF jobs)
- [ ] Add `apps/worker/.env.example` with `REDIS_URL` and `DATABASE_URL`

### Task 4: `packages/config` (shared env/constants)

Create the first `packages/*` entry only because Task 3 and `apps/api`
both need to parse the same env var shape (`DATABASE_URL`, `REDIS_URL`,
`PORT`) — this is the first genuine cross-app duplication, which is the
bar SRS §5 ("shared code belongs in packages only when genuinely
reusable") sets for creating one.

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/src/env.ts`
- Create: `packages/config/tsconfig.json`

- [ ] `env.ts` exports a small Zod schema (`DATABASE_URL: z.string().url()`,
  `REDIS_URL: z.string().url()`, `PORT: z.coerce.number().default(3000)`)
  and a `loadEnv()` function that parses `process.env` and throws with a
  readable message on failure
- [ ] `apps/api` and `apps/worker` depend on `@operant/config` (workspace
  protocol) and call `loadEnv()` at startup instead of reading
  `process.env` directly
- [ ] Do **not** create `packages/ui`, `packages/types`, or
  `packages/validation` yet — nothing needs them until Phase 1 (shared
  DTOs/enums) and Phase 1's frontend work (shared UI) respectively; adding
  them empty now is unused scaffolding

### Task 5: CI pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

Implements the pipeline shape from SRS §33.1 for the CI portion (staging
deploy and prod release are out of scope until there's something
deployable):

- [ ] Job triggers on `push` and `pull_request`
- [ ] Steps: checkout → setup Node (matching `devEngines.packageManager`) →
  `corepack enable` → `pnpm install --frozen-lockfile` → `pnpm lint` →
  `pnpm typecheck` → `pnpm build`
- [ ] A separate job spins up Postgres via `services:` (matching
  `docker-compose.yml` credentials) and runs
  `pnpm --filter api exec prisma migrate deploy` against it, to catch
  broken/non-reproducible migrations before merge
- [ ] No unit/integration/E2E test steps yet — added once Phase 1 has
  tests to run; an empty test step that always passes is worse than no
  step, so leave it out rather than stub it

### Task 6: Dockerfiles for `api` and `worker`

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/worker/Dockerfile`

- [ ] Multi-stage build: pnpm install (workspace-aware, `--filter`) → build
  → slim runtime image (`node:24-slim`) copying only `dist/` and
  production `node_modules`
- [ ] Not wired into CI/CD deployment yet (SRS §42.3 leaves hosting as an
  open decision) — this task only makes the images buildable and testable
  locally with `docker build`

---

## Definition of Done for this phase

- [ ] `docker compose up -d` brings up Postgres + Redis and both pass
  their health checks
- [ ] `pnpm install && pnpm dev` starts `web`, `api`, and now a real
  `worker` process without errors
- [ ] `pnpm --filter api exec prisma migrate dev` works against local
  Postgres, and `prisma migrate deploy` is exercised in CI against a
  fresh database
- [ ] `pnpm build` and `pnpm lint` succeed across all three apps
- [ ] CI runs green on a trivial PR
- [ ] Nothing product-specific (no `Organization`, `User`, etc.) has been
  added to the schema — that starts Phase 1

## Explicitly deferred

- Staging/production deploy targets (SRS §42.3 open decision: Vercel +
  managed backend vs. AWS from day one) — revisit once Phase 1 has
  something worth deploying.
- `packages/ui`, `packages/types`, `packages/validation` — created the
  first time a later phase needs them, not here.
