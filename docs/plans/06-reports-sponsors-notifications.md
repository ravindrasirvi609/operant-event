# Phase 6 — Reports, Sponsors, Advanced Notifications

**Spec:** SRS §19 (Sponsors and Exhibitors), §20 (Communications and
Notifications), §22 (Reporting and Analytics), §24 (Audit Logging — the
querying/export side; the schema and interceptor already exist from
Phase 1), §38 (Data Migration and Import/Export).

**Depends on:** everything in Phases 1–5 — this phase reports on and
communicates about data those phases created; it does not gate any of
them, so it's the safest phase to defer or reorder if priorities shift.

**Goal:** organizers manage sponsors/exhibitors commercially, every
templated notification actually gets sent through a real (queued)
channel, and dashboards/exports turn the operational data already
collected into decisions.

**Exit condition (SRS §39):** *Operational and commercial management
enhanced.*

---

## Data model

```prisma
model Sponsor {
  id            String @id @default(cuid())
  conferenceId  String
  name          String
  tier          String   // PLATINUM | GOLD | SILVER | BRONZE
  contactName   String?
  contactEmail  String?
  paymentStatus String   @default("PENDING")
  logoFileId    String?
  conference    Conference @relation(fields: [conferenceId], references: [id])
  @@index([conferenceId])
}

model Exhibitor {
  id            String @id @default(cuid())
  conferenceId  String
  companyName   String
  boothNumber   String?
  contactPerson String?
  paymentStatus String   @default("PENDING")
  conference    Conference @relation(fields: [conferenceId], references: [id])
  staff         ExhibitorStaff[]
  @@index([conferenceId])
}

model ExhibitorStaff {
  id          String @id @default(cuid())
  exhibitorId String
  name        String
  email       String?
  exhibitor   Exhibitor @relation(fields: [exhibitorId], references: [id])
}

model EmailTemplate {
  id             String  @id @default(cuid())
  organizationId String
  conferenceId   String? // null = organization-wide default, overridable per conference
  event          String  // matches the trigger names in the §20 table, e.g. "ABSTRACT_ACCEPTED"
  subject        String
  body           String  // template source; variables like {{participantName}}
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([organizationId, conferenceId, event])
}

model Notification {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  type           String
  title          String
  message        String
  data           Json?
  readAt         DateTime?
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
  @@index([userId, readAt])
}

model ExportJob {
  id             String   @id @default(cuid())
  organizationId String
  conferenceId   String?
  requestedBy    String
  type           String   // ABSTRACTS | REGISTRATIONS | PAYMENTS | AUDIT_LOG | ...
  status         String   @default("QUEUED") // QUEUED | RUNNING | DONE | FAILED
  resultFileId   String?
  error          String?
  createdAt      DateTime @default(now())
  completedAt    DateTime?
  @@index([organizationId, status])
}

model ImportJob {
  id             String   @id @default(cuid())
  organizationId String
  conferenceId   String?
  requestedBy    String
  type           String   // AUTHORS | REVIEWERS | REGISTRATIONS
  status         String   @default("QUEUED")
  sourceFileId   String
  errorReportFileId String?
  rowsProcessed  Int      @default(0)
  rowsFailed     Int      @default(0)
  createdAt      DateTime @default(now())
  completedAt    DateTime?
}
```

`Notification`/`EmailTemplate` already appear in every earlier phase's
"queue a notification" language — this phase is where the actual
sender/renderer gets built, retroactively wiring the events those phases
already emit (e.g. Phase 4's payment-confirmed event, Phase 3's
review-assigned event) into real delivery.

## Notification pipeline

```
notifications/
  notifications.module.ts  .controller.ts  .service.ts
  template-renderer.service.ts    # {{variable}} substitution against EmailTemplate.body
  notification.events.ts          # typed event names shared across modules
```

Every earlier module emits a domain event
(`this.eventEmitter.emit('abstract.accepted', payload)`) instead of
calling an email service directly — this phase adds the
`NotificationsModule` listener that maps each event to an
`EmailTemplate` lookup (`event` column) + render + enqueue on
`apps/worker`'s `email` queue, and writes a matching `Notification` row
for in-app display. Retrofitting earlier phases means going back and
adding one `emit()` call per trigger row in the §20 table — listed here
so it's not missed:

| Trigger (already exists in) | Event name |
|---|---|
| Abstract submitted (Phase 2) | `abstract.submitted` |
| Review assigned (Phase 3) | `review.assigned` |
| Review due (Phase 3 job) | `review.due` |
| Revision required (Phase 3) | `abstract.revision_required` |
| Abstract accepted (Phase 3) | `abstract.accepted` |
| Payment successful (Phase 4 webhook) | `payment.succeeded` |
| Certificate available (Phase 5 job) | `certificate.issued` |
| Event reminder (scheduled) | `conference.reminder` (new job, this phase) |

## Reporting/analytics

```
reports/
  reports.module.ts  .controller.ts  .service.ts
  dashboards/conference-overview.query.ts
  dashboards/abstracts.query.ts
  dashboards/review.query.ts
  dashboards/registration.query.ts
  dashboards/revenue.query.ts
  dashboards/attendance.query.ts
  dashboards/certificates.query.ts
  export.processor.ts   # BullMQ processor in apps/worker, produces CSV/XLSX via ExportJob
```

Each `*.query.ts` is a read-only, tenant-scoped aggregation matching one
row of the §22 dashboard table exactly (Conference Overview, Abstracts,
Review, Registration, Revenue, Attendance, Certificates) — implemented as
plain Prisma `groupBy`/raw SQL, not a generic reporting DSL, since the
seven dashboards are fully enumerated in the spec and don't need one.

## API surface

| Method & path | Purpose |
|---|---|
| `POST /api/v1/conferences/:id/sponsors` | sponsor CRUD |
| `POST /api/v1/conferences/:id/exhibitors` | exhibitor CRUD + staff |
| `GET /api/v1/organizations/:id/email-templates` | list/override templates |
| `PUT /api/v1/email-templates/:id` | edit subject/body |
| `GET /api/v1/notifications/my` | in-app notification inbox |
| `PATCH /api/v1/notifications/:id/read` | mark read |
| `GET /api/v1/conferences/:id/reports/:dashboard` | one of the 7 dashboards |
| `POST /api/v1/conferences/:id/exports` | ABS-010-style export, any entity type, returns `ExportJob.id` |
| `GET /api/v1/exports/:id` | poll status → download link when `DONE` |
| `POST /api/v1/conferences/:id/imports` | CSV import (authors/reviewers/registrations) |
| `GET /api/v1/imports/:id` | status + row-level error report link |

## Business rules

- Every export/report query is tenant + role scoped identically to every
  other module — this phase is the highest-risk one for accidentally
  building a "just query everything" admin report, so
  `ReportsService` reuses the same `OrganizationScopeGuard`/permission
  checks as every domain module, never a raw unscoped query.
- Large exports/imports never block an HTTP request (§22, §38, §31) —
  `POST .../exports` and `POST .../imports` return `202 Accepted` with a
  job id immediately; the client polls or gets notified via the
  `Notification` channel this phase just built.
- Import validation produces row-level errors and a downloadable error
  report (§38) — `ImportJob.errorReportFileId`, generated even on partial
  success (`rowsProcessed`/`rowsFailed` both populated).

## Gap flagged during self-review: plan entitlements & localization (SRS §23)

SRS §23 lists "Feature flags and plan entitlements" and "Time zone and
localization settings" as admin/config requirements, but the SRS gives
them no dedicated section, requirement IDs, or acceptance criteria the
way abstracts/reviews/payments get — unlike everything else in this
phase, there's nothing concrete to build against yet. `Conference` already
has a `timezone` field (Phase 1), which covers the second item
adequately for now. The first — SaaS-level subscription plans
(§2.2's "plan-based pricing and usage-based billing") gating which
features an `Organization` can use — genuinely has no home in Phases 0–6
and needs its own short requirements pass (plan tiers, what each tier
gates, upgrade/downgrade behavior, usage metering source) before it's
buildable. Treat it as a Phase 6 backlog item pending that scoping work,
not as something silently covered by the sponsor/report work above.

## Testing focus

- Unit: template variable rendering (missing variable → clear error, not
  a silent blank); each dashboard query against seeded fixture data with
  known expected aggregates.
- Integration: an event fired in Phase 3/4 code results in the correct
  `EmailTemplate` being rendered and a job enqueued (assert on the queue,
  not on an actual sent email).
- Security: exports are tenant-scoped — attempt to export another
  organization's data via a crafted `conferenceId` and confirm rejection.

## Definition of Done

- [ ] Every trigger row in the §20 table results in a real queued
  notification end-to-end.
- [ ] All 7 dashboards in §22 return correct aggregates against fixture
  data.
- [ ] Exports/imports are asynchronous, resumable-status, and produce
  row-level error reports.
- [ ] Sponsor/exhibitor CRUD is tenant-scoped like every other module.
