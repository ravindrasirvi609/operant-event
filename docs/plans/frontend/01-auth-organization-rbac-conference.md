# Frontend Phase 1 — Organization, RBAC, Conference

**Spec:** SRS §7 (Multi-Tenancy), §8 (RBAC), §9 (Conference Lifecycle),
§35, §36.

**Depends on:** `frontend/00-foundation.md` (auth cookies, proxy, org
switcher, `AsyncBoundary`, `ConfirmDialog`, permissions mirror). Backend
Phase 1 (`OrganizationsController`, `RolesController`,
`ConferencesController`, `ConferenceSettingsController`, `TracksController`,
`ConferenceFormFieldsController`, `AuthController.sessions`).

**Goal:** an Organization Owner can create an organization, invite
members, assign roles, create a conference, configure it (settings,
tracks, abstract form builder), and publish it — entirely through the UI,
with every action gated by the same permission the backend enforces.

**Exit condition:** a fresh account can go from "just registered" to "has
a published conference with at least one track and one custom form
field" without touching the API directly.

---

## Route tree

```
app/(dashboard)/
  page.tsx                              # organization landing: conference list
  organizations/new/page.tsx            # first-run: create an organization
  organizations/[orgId]/settings/page.tsx
  organizations/[orgId]/members/page.tsx
  organizations/[orgId]/roles/page.tsx
  account/sessions/page.tsx              # GET/DELETE auth/sessions
  conferences/new/page.tsx
  conferences/[conferenceId]/layout.tsx  # conference sub-nav (tabs)
  conferences/[conferenceId]/page.tsx    # overview
  conferences/[conferenceId]/settings/page.tsx
  conferences/[conferenceId]/tracks/page.tsx
  conferences/[conferenceId]/form-builder/page.tsx
```

## API surface consumed (real paths, `/api/v1` prefix implied)

| Page/action | Method & path | Header/param wiring |
|---|---|---|
| Create organization | `POST organizations` | body only |
| Landing org list | `GET organizations/me` | — |
| Update organization | `PATCH organizations/:id` | **path `:id` — no `x-organization-id` header check bypassed; still send the active-org header and keep it equal to `:id`** (see Phase 0's drift note) |
| Invite member | `POST organizations/:id/members` | same path/header pairing rule |
| Update membership (role/status) | `PATCH organizations/:id/members/:membershipId` | same |
| List roles | `GET organizations/:id/roles` | same |
| Create role | `POST organizations/:organizationId/roles` | same |
| List sessions | `GET auth/sessions` | no org header (user-scoped) |
| Revoke session | `DELETE auth/sessions/:id` | no org header |
| Create conference | `POST conferences` | `x-organization-id` header, `CONFERENCE_CREATE` |
| List conferences | `GET conferences` | header, `CONFERENCE_READ` |
| Conference detail | `GET conferences/:id` | header, `CONFERENCE_READ` |
| Update conference | `PATCH conferences/:id` | header, `CONFERENCE_UPDATE` |
| Change status | `PATCH conferences/:id/status` | header, `CONFERENCE_UPDATE` |
| Publish | `POST conferences/:id/publish` | header, `CONFERENCE_UPDATE` |
| Settings get/upsert | `GET`/`PUT conferences/:conferenceId/settings` | header, `CONFERENCE_READ`/`UPDATE` |
| Tracks list/create/update/reorder | `conferences/:conferenceId/tracks[...]` | header, `CONFERENCE_READ`/`UPDATE` |
| Form fields list/create/update | `conferences/:conferenceId/form-fields[...]` | header, `CONFERENCE_READ`/`UPDATE` |

## Components

- `<OrganizationForm>` — create/edit, `react-hook-form` + zod mirroring
  the backend's create-organization DTO (name, slug if the DTO has one —
  confirm exact fields when implementing; do not guess a field the
  backend doesn't accept).
- `<MembersTable>` — uses shadcn `Table`; role badges use text + a fixed
  color-per-role mapping (never color alone, SRS §36); row actions
  (change role, suspend) gated by `hasPermission(..., PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS)`
  — hide the action entirely rather than show-then-403, since the
  permission mirror (Phase 0 Task 4) makes this cheap.
- `<RoleEditor>` — a checkbox grid over the 23-key permission catalogue,
  grouped by module (`organization.*`, `conference.*`, `abstract.*`, ...)
  matching the module/action split already used in
  `PERMISSION_CATALOGUE` backend-side, so the grouping the user sees maps
  1:1 to what the backend seeded.
- `<ConferenceForm>` — multi-field create/edit (name, dates, timezone,
  description); timezone picker is a searchable `Select`, not free text
  — `Conference.timezone` is consumed by every date/deadline shown
  anywhere later in the app, so getting this input right here avoids
  every subsequent phase re-solving "what timezone is this deadline in."
- `<ConferenceStatusBadge>` + `<PublishConferenceButton>` — publish uses
  `<ConfirmDialog>` (not typed-confirmation — publishing isn't
  irreversible the way a refund is).
- `<TrackList>` — drag-reorder (calls `PUT .../tracks/reorder`);
  degrades to explicit up/down buttons on touch/keyboard (drag-only
  reordering fails SRS §36's keyboard-navigation requirement on its own).
- `<FormFieldBuilder>` — organizer-facing builder for
  `ConferenceFormField` rows (label, type, required, options for
  select/radio types, active/inactive toggle). This is the schema that
  Phase 2's abstract submission form renders dynamically — the field
  `type` enum used here **must** match exactly what
  `apps/api/src/conference-form-fields/abstract-form-validator.ts`
  validates against; read that file before building the type picker so
  the UI never offers a type the backend validator doesn't handle.

## Business rules (UI-side)

- Organization/role management pages render nothing (not a disabled
  button — nothing) for a member without `ORGANIZATION_MANAGE_MEMBERS` /
  `ORGANIZATION_MANAGE_ROLES` — confirmed via the permissions mirror
  before the page even queries the list, so a non-admin never sees a
  flash of UI they can't use.
- A conference in `DRAFT` status shows a persistent banner
  ("Not visible to participants yet") on every one of its sub-pages;
  `PUBLISHED` conferences show the publish button as disabled/relabeled
  "Published" rather than removed, so status is always visible without
  requiring a separate lookup.
- The organization switcher (Phase 0) and this phase's conference list
  must agree: switching organizations always navigates back to
  `(dashboard)/page.tsx` rather than staying on a conference detail page
  that belonged to the old organization.

## Testing focus

- Unit/component (Vitest + RTL): `<RoleEditor>` permission-grouping logic,
  `<FormFieldBuilder>` type-picker only offering backend-supported types,
  `<ConfirmDialog>` typed-confirmation gating (shared component, tested
  once here, reused everywhere).
- E2E (Playwright, extends `e2e/login.spec.ts`): register → verify email
  (stub/skip if email verification is dev-disabled) → create organization
  → invite a second member → create conference → add a track → add a
  custom form field → publish.

## Definition of Done

- [ ] Every action in the API surface table above has a UI entry point.
- [ ] A member without `CONFERENCE_UPDATE` sees the conference detail page
  as read-only (no edit/publish/settings controls rendered).
- [ ] Timezone selection on `<ConferenceForm>` round-trips correctly —
  create a conference with a non-UTC timezone, reload, confirm it displays
  the same value.
- [ ] `<FormFieldBuilder>`'s type options are diffed against
  `abstract-form-validator.ts` and match exactly (no offered type the
  backend rejects, no backend-supported type missing from the picker).

## Explicitly deferred

- Bulk member invite (CSV) — Phase 6's import job covers CSV ingestion
  generally; a bulk-invite-specific UI is not in the SRS's phase-1 scope.
- SSO/SAML org login — SRS §40 future enhancement, not this phase.
