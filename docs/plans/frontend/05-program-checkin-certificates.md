# Frontend Phase 5 — Sessions, Speakers, Schedule, Check-in, Certificates

**Spec:** SRS §15 (Program/Scheduling), §16 (Speakers/Chairs), §17
(Attendance/Check-in/Badge), §18 (Certificates), §35, §36, §37.

**Depends on:** `frontend/00-foundation.md`, `frontend/04-...md`
(`Registration` status). Backend Phase 5 (`SessionsController`,
`SpeakersController`, `PresentationsController`, `CheckinsController`,
`AttendanceController`, `CertificatesController`).

**Goal:** an organizer builds and publishes a session schedule with
speakers and accepted-abstract presentations; event-day staff check
attendees in via QR scan or manual search in under a second on a phone
or tablet; a participant can view and publicly share a certificate.

**Exit condition (SRS §35 quoted directly):** check-in "prioritizes large
touch targets, fast search and clear success/failure feedback" and this
is verified against the real endpoint, not simulated.

---

## Route tree

```
app/(dashboard)/
  conferences/[conferenceId]/program/page.tsx          # organizer: session builder
  conferences/[conferenceId]/speakers/page.tsx          # organizer: speaker roster
  conferences/[conferenceId]/certificates/page.tsx      # organizer: generate/issue queue
(checkin)/                                              # own minimal-chrome layout, no sidebar
  checkin/[conferenceId]/page.tsx                       # staff: scan/search UI
(public)/
  conferences/[conferenceId]/program/view/page.tsx      # GET .../program, no auth
  verify/[code]/page.tsx                                # GET certificates/verify/:code, no auth
(participant)/
  certificates/[certificateId]/page.tsx                 # GET certificates/:id, owner-only
```

`(checkin)` gets its own layout deliberately — SRS §35's "large touch
targets, fast search" requirement is incompatible with squeezing the
scanner into the same shell that carries an org switcher, sidebar nav,
and desktop-density tables. Full-bleed, high-contrast, minimal chrome,
tablet/phone-first.

## API surface consumed

| Page/action | Method & path | Notes |
|---|---|---|
| Public program | `GET conferences/:conferenceId/program` | no auth |
| Organizer session list | `GET conferences/:conferenceId/sessions` | header, `PROGRAM_MANAGE` |
| Create/update session | `POST`/`PATCH` `.../sessions[...]` | `CreateSessionDto`/`UpdateSessionDto`, header, `PROGRAM_MANAGE` |
| Publish session | `POST sessions/:id/publish` | header, `PROGRAM_MANAGE` |
| Assign speakers | `PUT sessions/:id/speakers` | `AssignSpeakersDto { assignments: [{speakerId, role}] }`, header, `PROGRAM_MANAGE` |
| Speaker roster | `conferences/:conferenceId/speakers[...]` | `CreateSpeakerDto`, header, `PROGRAM_MANAGE` |
| Assign presentation | `POST sessions/:sessionId/presentations` | `AssignPresentationDto { abstractId, presentationType?, startTime, endTime, sortOrder? }`, header, `PROGRAM_MANAGE` |
| Check-in | `POST checkins` | `CheckinDto { conferenceId, qrCode? \| registrationNumber? \| email?, checkinType, sessionId?, allowReentry?, deviceId? }`, header, `CHECKIN_MANAGE` |
| Check-in dashboard | `GET conferences/:conferenceId/checkins` | header, `CHECKIN_MANAGE` |
| Attendance list | `GET conferences/:conferenceId/attendance` | header, `CHECKIN_MANAGE` |
| Generate certificates | `POST conferences/:conferenceId/certificates/generate` | header, `CERTIFICATE_MANAGE` |
| Issue certificate | `POST certificates/:id/issue` | header, `CERTIFICATE_MANAGE` |
| Certificate (organizer view) | `GET certificates/:id/organizer` | header, `CERTIFICATE_MANAGE` |
| Certificate (owner view) | `GET certificates/:id` | no header |
| Public verification | `GET certificates/verify/:code` | no auth — returns only the §18 minimum-field shape |

## Components

- `<SessionScheduleBuilder>` — calendar/timeline view (day columns, room
  rows) for creating/editing sessions; drag-to-adjust time is a nice-to-have
  but every action must also work via explicit start/end time inputs
  (SRS §36 keyboard-navigation requirement — a drag-only scheduler fails
  it outright).
- `<SessionEndTimeValidation>` — `endTime > startTime` enforced
  client-side before submit (mirrors the backend's stated business rule),
  still handles the `400` the backend returns if it's ever bypassed.
- `<PresentationDragAssign>` — assigns accepted (`Abstract.status ===
  'ACCEPTED'`) abstracts into a session's presentation slots; client-side
  warns (not blocks — the backend's `@@unique([sessionId, abstractId])`
  and `ScheduleConflictService` are the real enforcement) if a
  presentation's time falls outside its session's bounds or the same
  abstract is already scheduled elsewhere.
- `<PublishScheduleButton>` — publishing locks in the "stable public
  representation" (SRS §15.1); UI copy makes clear further edits create
  a new version rather than silently mutating what's already public.
- `<SpeakerRoster>` + `<SpeakerAssignmentPicker>` — role picker
  (`SPEAKER`/`CHAIR`/`CO_CHAIR`/`KEYNOTE`) as a per-row select inside the
  `AssignSpeakersDto` array editor.
- `<CheckinScanner>` — the centerpiece of this phase:
  - Primary input: camera-based QR scan using the browser's native
    `BarcodeDetector` API where available, falling back to a small
    JS QR-decoding library (e.g. one that reads video frames via
    `getUserMedia`) on browsers without it — **decide the exact fallback
    library during implementation**, not speculatively pinned here.
  - Always-visible secondary input: a manual search field
    (registration number or email) — SRS §36 explicit requirement: "QR/
    check-in UI should still offer manual alternative," not a
    fallback hidden behind a toggle.
  - Large tap targets (minimum 44×44px per common mobile-a11y guidance,
    matching SRS §35's "large touch targets"), full-screen success
    (green, checkmark icon + attendee name) / failure (red, X icon +
    reason) states that auto-dismiss after a few seconds so staff can
    keep scanning without tapping "OK" between every attendee.
  - Re-entry: the checkin type selector defaults to `MAIN_EVENT`; a
    staff member with `allowReentry` permission context sees a visible
    "allow re-entry" toggle (per-scan, not sticky) — default off, since
    the backend treats re-scan as a no-op `200` unless this is
    explicitly set.
  - `deviceId` is a client-generated, locally-persisted (not
    per-session) identifier so the check-in dashboard can later show
    "scanned by which device," useful for event-day troubleshooting.
- `<CheckinDashboard>` — live count (poll every 10–15s while the tab is
  open, per §32's "operational dashboards for event-day check-in
  services" — no WebSocket gateway exists, polling is the pragmatic
  match for the infrastructure that's actually there).
- `<CertificateGenerationPanel>` — organizer triggers `generate` (runs
  the full eligibility sweep synchronously today — see
  `docs/plans/worker/05-certificate-pdf.md` for why this should
  eventually move to a job for large conferences) and reviews resulting
  `ELIGIBLE` rows before bulk-`issue`-ing them.
- `<CertificateView>` (owner) vs `<PublicVerificationCard>` (public,
  `/verify/[code]`) — **the public card renders only the exact §18
  fields the backend returns** (`certificateNumber`, `holderName`,
  `conferenceName`, `certificateType`, `issuedAt`, `status`) — do not
  add a "view full certificate" link from the public page back to any
  authenticated resource; the whole point of the minimum-fields
  response is that anonymous verification never becomes a pivot into
  the real registration/user record.

## Business rules (UI-side)

- `<CheckinScanner>` never blocks on the camera permission prompt to
  show the manual-search field — both are visible and usable
  immediately, camera activates progressively.
- The organizer-facing program builder is desktop/tablet-first (SRS §37:
  "organizer back-office workflows may be desktop-first but must remain
  usable on tablet-sized screens"); the public program view and the
  check-in scanner are mobile-first.
- A certificate's PDF (`fileId`) is null until the backend's PDF
  render step exists (currently deferred, see the worker plan) — both
  `<CertificateView>` and `<PublicVerificationCard>` must render a clear
  "certificate issued, document pending" state rather than a broken
  download link, exactly as `<InvoiceView>` does in Phase 4.

## Testing focus

- Unit: `<CheckinScanner>` manual-search path never depends on camera
  permission having been granted; success/failure state auto-dismiss
  timing.
- E2E (Playwright, explicitly named in SRS §34's E2E row): confirmed
  registration → staff check-in via manual search (headless browsers
  can't easily simulate a camera QR scan, so the E2E path exercises the
  manual fallback, which is required to work standalone anyway) →
  attendance recorded → certificate eligibility flips after the
  generate step → public verification page shows the minimum fields for
  the resulting certificate's code.
- Manual/exploratory (not automatable): actual QR camera scan on a real
  phone against a real printed/displayed QR code — call this out
  explicitly as a pre-release manual test step, since Playwright cannot
  drive a device camera against a physical code.

## Definition of Done

- [ ] Manual search check-in works with zero camera permission granted.
- [ ] Re-scanning the same registration for the same `checkinType` is a
  visible no-op (not an error toast) unless `allowReentry` was set.
- [ ] Public verification page confirmed (via a network tab check, not
  just visual inspection) to receive only the six §18 fields — no
  `registrationId`/`userId`/full name beyond the configured
  full-vs-initial setting ever appears in the response body.
- [ ] Schedule builder fully keyboard-operable without drag.

## Explicitly deferred

- Badge printing (SRS §17: "badge template supports name, type,
  organization and QR at minimum") — no backend endpoint renders a
  badge yet; this phase builds the check-in/certificate UI only. Track
  badge rendering as a follow-up once a backend badge endpoint exists.
- Offline-tolerant check-in mode — SRS §40 future enhancement.
