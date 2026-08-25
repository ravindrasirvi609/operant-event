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

`packages/config` contains shared environment validation used by the API and
worker.

## Getting started

This repo pins its package manager via `packageManager`/`devEngines` in
`package.json`. If pnpm isn't installed globally, prefix commands with
`corepack`, e.g. `corepack pnpm install`.

### Run locally

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create the API environment file:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/worker/.env.example apps/worker/.env
   ```

3. Start PostgreSQL and Redis:

   ```bash
   docker compose -f infrastructure/docker/docker-compose.yml up -d
   ```

4. Start the frontend, backend, shared config watcher, and worker together:

   ```bash
   pnpm dev
   ```

The services use these URLs:

- Frontend: http://localhost:3000
- API: http://localhost:3001/api/v1
- Swagger API docs: http://localhost:3001/api/v1/docs

Stop the development processes with `Ctrl+C`. Stop the Docker services with:

```bash
docker compose -f infrastructure/docker/docker-compose.yml down
```

Prisma commands run from `apps/api`, e.g. `pnpm --filter api exec prisma migrate dev`.
