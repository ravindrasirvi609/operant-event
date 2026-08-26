# Operant Event — Phase Plans

Implementation blueprint for the whole product, broken into the 8 release
phases defined in the SRS (`docs/Operant_Event_Conference_SaaS_SRS.docx`,
§39 "Release Phases and MVP"). Each file below is a **phase-level
specification**: scope, data model, module/file layout, API surface,
business rules, and Definition of Done — grounded in the SRS's functional
requirement IDs (`AUTH-*`, `ORG-*`, `CONF-*`, `ABS-*`, `REV-*`, `PAY-*`,
`REG-*`) so nothing here contradicts the baseline document.

These are **not** yet bite-sized, test-by-test execution plans. Right
before a phase starts, run the `writing-plans` skill again against that
phase's file to produce the granular, subagent-executable task list
(`superpowers:writing-plans` → `superpowers:subagent-driven-development`
or `superpowers:executing-plans`). Writing all of that detail for all 8
phases today would mean locking implementation decisions for work that's
months out and depends on choices made in earlier phases — so this layer
stays at the "what gets built, with what shape" altitude, and the
task-by-task layer gets generated fresh, phase by phase.

| # | File | Phase (SRS §39) | Exit condition |
|---|------|------------------|-----------------|
| 0 | [00-foundation.md](00-foundation.md) | Phase 0 | Apps boot locally; DB migration pipeline works |
| 1 | [01-auth-organization-rbac-conference.md](01-auth-organization-rbac-conference.md) | Phase 1 | Tenant-safe conference creation and management works |
| 2 | [02-abstract-submission.md](02-abstract-submission.md) | Phase 2 | Authors can submit versioned abstracts end-to-end |
| 3 | [03-review-management.md](03-review-management.md) | Phase 3 | Complete review lifecycle works with blind mode |
| 4 | [04-registration-payments.md](04-registration-payments.md) | Phase 4 | Paid registration is reliable and auditable |
| 5 | [05-program-checkin-certificates.md](05-program-checkin-certificates.md) | Phase 5 | Conference can run operationally |
| 6 | [06-reports-sponsors-notifications.md](06-reports-sponsors-notifications.md) | Phase 6 | Operational and commercial management enhanced |
| 7 | [07-future-scope.md](07-future-scope.md) | Phase 7 | Advanced differentiation and scale features |

These files above cover `apps/api`'s schema/service/controller shape
only. Two sibling plan sets, written after all 7 backend phases were
implemented and verified, cover the rest of the stack at the same
altitude, grounded in the real (not originally-sketched) API surface:

- **[`frontend/`](frontend/README.md)** — `apps/web`, one file per
  backend phase, plus a Phase 0 covering the auth/proxy/design-system
  plumbing every later frontend phase depends on.
- **[`worker/`](worker/README.md)** — `apps/worker`'s BullMQ processors,
  one file per backend phase that actually introduced async work
  (3 through 6), plus a Phase 0 covering shared queue conventions.

## Cross-phase rules (apply to every phase below)

These come from SRS §7.1 (Tenant Isolation), §28 (Security) and §5
(Product Principles) and are not repeated in full in each file:

- Every tenant-owned table carries `organizationId` directly, or is only
  reachable through a parent that does (e.g. `Abstract` has no
  `organizationId` column but is reached via `Conference.organizationId`).
- `organizationId`/`conferenceId` context comes from the authenticated
  session/membership, never from a client-supplied body/query value.
- Every conference-scoped endpoint verifies the conference belongs to the
  caller's organization before touching child records.
- Money, review, decision and audit records are append-only history —
  never destructively overwritten.
- Anything expensive (email, PDF, export, import) is a BullMQ job, not
  inline request work.
- Payment truth comes from provider webhooks only — a client-side success
  callback never marks an order paid (SRS §14).
- Every list endpoint is paginated with stable ordering and a capped page
  size; search is always tenant-scoped and respects blind-review
  visibility (SRS §25).

## Naming conventions used throughout these files

Prisma model names are PascalCase, fields camelCase, ids `String @id
@default(cuid())`, matching the sample in SRS §27.1. Enums are the exact
values from SRS Appendix B. Human-facing identifiers (`submissionNumber`,
`registrationNumber`, `invoiceNumber`, `certificateNumber`) are separate
unique business keys from the primary `id`, per SRS §27.

Each phase file's Prisma snippet shows only the models/fields that phase
*introduces*. A later phase that adds a relation onto an earlier model
(e.g. Phase 3's `ReviewAssignment.abstract` pointing at Phase 2's
`Abstract`) is noted in that later phase's text — the corresponding
back-reference array field on the earlier model (`Abstract.reviewAssignments`)
gets added to the actual `schema.prisma` when that later phase is
implemented, not written into every earlier file retroactively.
