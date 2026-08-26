# Frontend Phase 6 — Reports, Sponsors, Notifications

**Spec:** SRS §19 (Sponsors/Exhibitors), §20 (Communications), §22
(Reporting), §38 (Import/Export), §35, §36.

**Depends on:** `frontend/00-foundation.md`. Backend Phase 6
(`SponsorsController`, `ExhibitorsController`, `EmailTemplatesController`,
`NotificationsController`, `ReportsController`, `ExportsController`,
`ImportsController`). Also depends on `docs/plans/worker/06-email-export-import.md`
actually running — several pages in this phase are only as useful as
their job's real completion, not just the "job accepted" response.

**Goal:** organizers manage sponsors/exhibitors, customize notification
templates, see a notification inbox, view all 7 report dashboards, and
run/poll async exports and imports — all through the UI.

**Exit condition:** all 7 dashboards render against real aggregate data,
and an export request goes from `202 Accepted` to a downloadable result
without the page holding an open connection.

---

## Route tree

```
app/(dashboard)/
  conferences/[conferenceId]/sponsors/page.tsx
  conferences/[conferenceId]/exhibitors/page.tsx
  organizations/[orgId]/email-templates/page.tsx
  conferences/[conferenceId]/reports/page.tsx            # dashboard picker + tabs
  conferences/[conferenceId]/exports/page.tsx            # request + history
  conferences/[conferenceId]/imports/page.tsx            # request + history
  notifications/page.tsx                                  # GET notifications/my
```

## API surface consumed

| Page/action | Method & path | Notes |
|---|---|---|
| Sponsors CRUD | `conferences/:conferenceId/sponsors[...]` | header, `SPONSOR_MANAGE`; create body `{ name, tier, contactName?, contactEmail?, logoFileId? }` |
| Exhibitors + staff | `conferences/:conferenceId/exhibitors[...]`, `exhibitors/:id/staff`, `exhibitor-staff/:staffId` | header, `EXHIBITOR_MANAGE` |
| Email templates list/edit | `email-templates[...]` | header, `EMAIL_TEMPLATE_MANAGE`; `GET` takes optional `?conferenceId=` query, `PUT :id` body `{ subject?, body? }` |
| Notification inbox | `GET notifications/my`, `PATCH notifications/:id/read` | no header (user-scoped) |
| Dashboards | `GET conferences/:conferenceId/reports/:dashboard` | header, `REPORT_VIEW`; `:dashboard` ∈ `conference-overview \| abstracts \| review \| registration \| revenue \| attendance \| certificates` (exact string keys — read `apps/api/src/reports/dashboard.constants.ts`, don't guess kebab-vs-snake casing) |
| Create export | `POST conferences/:conferenceId/exports` | `202`, header, `EXPORT_MANAGE`; body `{ type }` (`ABSTRACTS \| REGISTRATIONS \| PAYMENTS \| AUDIT_LOG`) |
| Poll export | `GET exports/:id` | header |
| Create import | `POST conferences/:conferenceId/imports` | `202`, header, `IMPORT_MANAGE`; body `{ type, sourceFileId }` (`AUTHORS \| REVIEWERS \| REGISTRATIONS`) — upload the file via the Phase-0 files proxy first to get `sourceFileId` |
| Poll import | `GET imports/:id` | header |

## Components

- `<SponsorTable>` / `<SponsorForm>` — tier badge (`PLATINUM`/`GOLD`/
  `SILVER`/`BRONZE`) as a color+label chip; payment-status badge
  (`PENDING`/`INVOICED`/`PAID`).
- `<ExhibitorTable>` with an expandable staff sub-list; `<AddStaffDialog>`.
- `<EmailTemplateEditor>` — subject/body text areas with a live preview
  that highlights `{{variable}}` tokens (matching
  `TemplateRendererService`'s exact `\{\{\s*([\w.]+)\s*\}\}` pattern —
  copy the same regex client-side for the preview highlighter so it
  never highlights something the backend wouldn't actually substitute);
  organization-wide default vs. conference-specific override shown as
  two distinct list sections, matching `EmailTemplatesService.resolve`'s
  fallback order (specific wins, falls back to default) — the UI should
  make that precedence visible, not just list rows undifferentiated by
  `conferenceId`.
- `<NotificationBell>` + `<NotificationList>` — poll `notifications/my`
  (short interval, e.g. 30s, while any authenticated page is open — a
  global concern, so this hook lives in `(dashboard)/layout.tsx` from
  Phase 0/1, not re-fetched per page) with an unread-count badge derived
  from `readAt === null` rows; clicking a notification calls `markRead`
  then navigates to whatever the notification's `type`/`data` implies
  (e.g. `abstract.accepted` → that abstract's detail page).
- `<DashboardTabs>` — one tab per report key; each tab's content is a
  small set of stat tiles + one chart (bar/pie as appropriate — see the
  `dataviz` guidance already available as a skill if charts are built)
  matching that dashboard's actual response shape:
  - `conference-overview`: `totalAbstracts`, `totalRegistrations`,
    `totalRevenue`, `totalCheckins`, `totalCertificatesIssued` as stat
    tiles.
  - `abstracts`/`certificates`: status (and type, for certificates)
    breakdown as a bar/pie.
  - `review`: status breakdown + `averageOverallScore` + `overdueCount`.
  - `registration`: status breakdown + by-type breakdown.
  - `revenue`: `totalCollected`, by-provider breakdown, `totalRefunded`.
  - `attendance`: by-checkin-type breakdown + `uniqueAttendees`.
- `<ExportRequestForm>` + `<JobStatusPoller>` — a small shared polling
  hook (`useJobPolling(path, { intervalMs, terminalStatuses: ['DONE','FAILED'] })`)
  used by both exports and imports pages; on `DONE`, renders a download
  link from `resultFileId` (via the files download-url endpoint from
  Phase 0/4's file wrapper); on `FAILED`, shows `error`.
- `<ImportRequestForm>` — file picker → upload → `sourceFileId` → create
  import; result view additionally shows `rowsProcessed`/`rowsFailed`
  and, once failed rows exist, a link to `errorReportFileId` (same
  download-url pattern) — matches SRS §38's "row-level errors and a
  downloadable error report."

## Business rules (UI-side)

- Every export/import/report page passes through the exact same
  `x-organization-id`/`conferenceId` pairing discipline as every other
  phase — this phase is explicitly called out backend-side as "the
  highest-risk one for accidentally building a query-everything admin
  report," and the frontend must not undermine that by, say, letting a
  dashboard tab's URL `conferenceId` be edited without re-deriving the
  active organization from the same source of truth as everywhere else.
- `<JobStatusPoller>` always has a max poll count / backoff, never an
  infinite fixed-interval loop — a job stuck in `RUNNING` for an
  unreasonable time should visibly say "taking longer than expected,"
  not silently poll forever.

## Testing focus

- Unit: `{{variable}}` highlighter regex matches the backend's exactly
  (shared test fixture: a template string with one valid and one
  malformed token, assert only the valid one highlights).
- Unit: `<JobStatusPoller>` stops polling on a terminal status and
  respects its max-attempts cap.
- E2E: create a sponsor, edit an email template's subject, trigger an
  export, poll it to `DONE`, download the result link.

## Definition of Done

- [ ] All 7 dashboard tabs render against seeded fixture data with the
  exact aggregate numbers a direct API call returns.
- [ ] Export/import pages never hold an open request past the initial
  `202` — verified by confirming the request completes (network tab)
  well before the job itself finishes.
- [ ] Notification bell's unread count matches `GET notifications/my`'s
  `readAt === null` count exactly.

## Explicitly deferred

- In-app real-time push for notifications (WebSocket/SSE) — polling
  only, matching the backend's current infrastructure (see
  `docs/plans/frontend/00-foundation.md`'s "Explicitly deferred").
- CRM-style sponsor/exhibitor pipeline views — SRS §40 future
  enhancement ("Advanced CRM for exhibitors/sponsors").
- Plan-entitlement/feature-flag gating in the UI — SRS §23 has no
  concrete backend shape yet (flagged as a backlog item in
  `docs/plans/06-reports-sponsors-notifications.md`'s self-review
  section); nothing to wire until that scoping happens.
