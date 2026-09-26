# Prisma Migration Runbook

## Background

This repo uses Prisma Migrate to manage the PostgreSQL schema. Migrations live
in `packages/database/prisma/migrations/` and are committed to git. The deploy
script (`infrastructure/scripts/deploy-operant-event.sh`) and the CI
`migration-check` job both run `prisma migrate deploy`, which applies any
pending migrations in order.

**Never use `db:push` against staging or production.** It bypasses the
migration history and silently drifts the schema. Reserve it for rapid local
dev iteration on a throwaway database.

---

## First-time setup on an existing production database

The first migration in this repo (`20260926120000_baseline`) captures the full
schema as it existed when migration tracking was introduced. Because production
already has that schema (built up by `db:push`), you must mark this migration
as already applied **without running it** — otherwise Prisma will try to create
tables that already exist.

Run this **once** on the production box (or from any machine with access to
the production DATABASE_URL):

```bash
# From the apps/api directory, with DATABASE_URL pointing at production:
export DATABASE_URL="<your-prod-database-url>"
pnpm --filter api run migrate:resolve -- --applied 20260926120000_baseline
```

After that one-time step, `prisma migrate deploy` will correctly see "no
pending migrations" and all future migrations will apply normally.

---

## Day-to-day development workflow

1. Edit `packages/database/prisma/schema.prisma`.
2. Generate a migration (requires a running dev Postgres — use
   `docker compose -f infrastructure/docker/docker-compose.yml up -d` to start
   one):

   ```bash
   # From repo root:
   pnpm --filter database run migrate:dev -- --name describe_the_change
   # Or, from apps/api (uses the config that CI/deploy also uses):
   pnpm --filter api run migrate:dev -- --name describe_the_change
   ```

3. Inspect the generated SQL in
   `packages/database/prisma/migrations/<timestamp>_<name>/migration.sql`.
   Edit it if the auto-generated SQL isn't quite right (e.g. to add a
   `CONCURRENTLY` index or a `DEFAULT` before a `NOT NULL` column add).

4. Commit `packages/database/prisma/migrations/` along with your schema change.

5. CI's `migration-check` job will apply the migration against a fresh
   Postgres instance. If it fails, fix the SQL before merging.

6. On deploy, `prisma migrate deploy` runs automatically before the build step.

---

## Emergency: revert a bad migration

Prisma Migrate does not support automatic rollback. If a migration causes an
incident:

1. **Stop the deploy** (cancel the GitHub Actions run or abort the deploy
   script early).
2. If the migration has already been applied, you must write a compensating
   migration manually (the reverse SQL). Never delete a migration that has been
   applied to any environment — this corrupts the migration history.
3. Apply the compensating migration through the normal `migrate deploy` path.

---

## Seeding

```bash
pnpm --filter api run db:seed
```

Seed data is in `apps/api/prisma/seed.ts`. Never run the seeder against
production.
