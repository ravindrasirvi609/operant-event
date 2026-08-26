# Operant Event — Frontend Phase Plans

The `apps/web` counterpart to `docs/plans/*.md`, one file per backend
phase, at the same altitude: what gets built, with what shape, wired
against the **actually implemented** backend (routes/DTOs/permissions
confirmed by reading the real controllers, not re-derived from the
original backend plan sketches, which drifted in a few small places —
each such drift is called out explicitly where it matters).

Written after all 7 backend phases (`docs/plans/00`–`06`) were built and
verified — so unlike the backend plans, these are grounded in a real,
running API surface, not a spec being implemented for the first time.

| # | File | Depends on backend | Exit condition |
|---|------|---------------------|-----------------|
| 0 | [00-foundation.md](00-foundation.md) | Phase 1 (auth) | Login → dashboard round-trip through real cookies/proxy/refresh |
| 1 | [01-auth-organization-rbac-conference.md](01-auth-organization-rbac-conference.md) | Phase 1 | Fresh account → published conference, entirely through the UI |
| 2 | [02-abstract-submission.md](02-abstract-submission.md) | Phase 2 | Author-only account submits a versioned abstract end-to-end |
| 3 | [03-review-management.md](03-review-management.md) | Phase 3 | Assign → review → decision loop, blind mode verified in the DOM |
| 4 | [04-registration-payments.md](04-registration-payments.md) | Phase 4 | Both GATEWAY and MANUAL payment paths work end-to-end |
| 5 | [05-program-checkin-certificates.md](05-program-checkin-certificates.md) | Phase 5 | Check-in verified fast/large-target/manual-fallback per SRS §35 |
| 6 | [06-reports-sponsors-notifications.md](06-reports-sponsors-notifications.md) | Phase 6 | All 7 dashboards + async export/import polling |
| 7 | [07-future-scope.md](07-future-scope.md) | — | What's explicitly not built yet, and why |

## Cross-phase rules (apply to every phase below)

Set once in Phase 0, not repeated per file:

- Tokens never reach client JS — httpOnly cookies + a server-side proxy
  (`app/api/proxy/[...path]/route.ts`) is the *only* thing that ever
  attaches `Authorization`/`x-organization-id`.
- The active organization is one piece of state
  (`useActiveOrganization()`), never re-derived per page.
- Every list/detail page uses the shared `<AsyncBoundary>` — no bespoke
  loading spinners.
- Every destructive action uses `<ConfirmDialog>`; refunds and other
  high-impact/irreversible ones require typed confirmation (SRS §35).
- Accessibility (SRS §36) and mobile/tablet responsiveness (SRS §37) are
  enforced by which shared components a page is built from, not audited
  after the fact.
- Route groups split by auth model, not by visual style: `(dashboard)`
  for organization-scoped staff pages, `(author)`/`(reviewer)`/
  `(participant)` for the "own resource, no org context" pages the real
  backend controllers actually expose that way, `(checkin)` for the
  event-day scanner's own minimal-chrome layout, `(public)` for
  no-auth pages.

## Real integration gaps found while writing these plans

Flagged inline in the relevant phase file, collected here for
visibility — these are backend follow-ups, not something the frontend
should silently work around:

- **Phase 4:** `FilesController` requires an active organization
  membership (`PermissionsGuard`) even for a payment-proof upload from a
  participant who may have none.
- **Phase 4:** no backend field carries organizer-authored manual-payment
  instructions text (`ConferenceSetting` has `paymentMode` but nothing
  for "here's our bank account").
- **Phase 2:** unclear whether `GET conferences/:conferenceId/form-fields`
  (needed by the unauthenticated-org author flow) tolerates a caller with
  no `x-organization-id` header at all, or requires one, and unclear
  whether the organizer abstract list endpoint paginates.
- **Phase 0:** `OrganizationsController.update`/`inviteMember`/
  `updateMembership`/`listRoles` and `RolesController.create` take the
  target org as a path param while `PermissionsGuard` still separately
  requires the `x-organization-id` header — the frontend must always
  send both and keep them equal; worth a backend consistency pass later.
