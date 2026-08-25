# Operant Event

Multi-tenant Conference & Event Management SaaS — abstract submission, peer
review, registration, payments, program/session management, certificates and
check-in for multiple organizations/conferences on one platform. The full
product and database design notes are in [docs/](docs/).

## Stack

- **Web** — Next.js, Tailwind, shadcn/ui (`apps/web`)
- **API** — NestJS, Prisma (`apps/api`)
- **Worker** — BullMQ background jobs (`apps/worker`) — scaffolded, not yet implemented
- **Database / Cache** — PostgreSQL, Redis (`infrastructure/docker`)

## Layout

```
apps/
  web/      Next.js frontend
  api/      NestJS API + Prisma schema
  worker/   BullMQ background workers (empty scaffold)
infrastructure/
  docker/   docker-compose for local Postgres + Redis
docs/       architecture and database design notes
```

`packages/` (shared ui/types/validation/config) is declared in the pnpm
workspace but doesn't exist yet — it will be added once code needs to be
shared across apps.

## Getting started

This repo pins its package manager via `packageManager`/`devEngines` in
`package.json`. If pnpm isn't installed globally, prefix commands with
`corepack`, e.g. `corepack pnpm install`.

1. Install dependencies: `pnpm install`
2. Start local Postgres + Redis: `docker compose -f infrastructure/docker/docker-compose.yml up -d`
3. Copy `apps/api/.env.example` to `apps/api/.env`
4. Run everything: `pnpm dev`

Prisma commands run from `apps/api`, e.g. `pnpm --filter api exec prisma migrate dev`.
