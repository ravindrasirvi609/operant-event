# Phase 5 — Sessions, Speakers, Schedule, Check-in, Certificates

**Spec:** SRS §15 (Program and Scheduling), §16 (Speakers/Chairs), §17
(Attendance/Check-in/Badge), §18 (Certificates).

**Depends on:** Phase 3 (`Abstract` — accepted ones get scheduled), Phase 4
(`Registration` — check-in and certificates are keyed off it).

**Goal:** organizers build a session schedule from accepted abstracts,
event-day staff check attendees in with a QR scan or manual search in
under a second, and eligible participants get a certificate with a public
verification page.

**Exit condition (SRS §39):** *Conference can run operationally.*

**Requirement IDs covered:** §15/§16 (no numbered IDs in the SRS for
these — requirements are the bulleted lists in those sections), plus the
certificate eligibility table in §18.

---

## Data model

```prisma
enum CertificateStatus { ELIGIBLE GENERATED ISSUED REVOKED }

model Session {
  id           String  @id @default(cuid())
  conferenceId String
  trackId      String?
  title        String
  description  String?
  room         String?
  sessionDate  DateTime
  startTime    DateTime
  endTime      DateTime
  sessionType  String?  // e.g. PLENARY | PARALLEL | WORKSHOP
  chairId      String?  // Speaker.id
  coChairId    String?  // Speaker.id
  status       String  @default("DRAFT") // DRAFT | PUBLISHED
  conference   Conference @relation(fields: [conferenceId], references: [id])
  track        ConferenceTrack? @relation(fields: [trackId], references: [id])
  speakers     SessionSpeaker[]
  presentations PresentationAssignment[]
  @@index([conferenceId, sessionDate])
}

model Speaker {
  id          String @id @default(cuid())
  conferenceId String
  userId      String?
  name        String
  designation String?
  institution String?
  bio         String?
  photoFileId String?
  country     String?
  conference  Conference @relation(fields: [conferenceId], references: [id])
  sessions    SessionSpeaker[]
  @@index([conferenceId])
}

model SessionSpeaker {
  sessionId String
  speakerId String
  role      String // SPEAKER | CHAIR | CO_CHAIR | KEYNOTE
  session   Session @relation(fields: [sessionId], references: [id])
  speaker   Speaker @relation(fields: [speakerId], references: [id])
  @@id([sessionId, speakerId, role])
}

model PresentationAssignment {
  id               String @id @default(cuid())
  sessionId        String
  abstractId       String
  presentationType String?
  startTime        DateTime
  endTime          DateTime
  sortOrder        Int    @default(0)
  session          Session @relation(fields: [sessionId], references: [id])
  abstract         Abstract @relation(fields: [abstractId], references: [id])
  @@unique([sessionId, abstractId])
  @@index([abstractId])
}

model Checkin {
  id             String @id @default(cuid())
  conferenceId   String
  registrationId String
  checkinType    String  // MAIN_EVENT | WORKSHOP | SESSION | BANQUET
  checkedInAt    DateTime @default(now())
  deviceId       String?
  conference     Conference @relation(fields: [conferenceId], references: [id])
  registration   Registration @relation(fields: [registrationId], references: [id])
  @@index([registrationId])
  @@index([conferenceId, checkinType])
}

model Attendance {
  id             String @id @default(cuid())
  conferenceId   String
  registrationId String
  sessionId      String?
  checkedInAt    DateTime @default(now())
  registration   Registration @relation(fields: [registrationId], references: [id])
  session        Session? @relation(fields: [sessionId], references: [id])
  @@index([registrationId])
  @@index([sessionId])
}

model Certificate {
  id                 String @id @default(cuid())
  conferenceId       String
  registrationId     String
  certificateType     String  // PARTICIPATION | PRESENTATION | SPEAKER | REVIEWER | CHAIR | WORKSHOP
  certificateNumber   String @unique
  fileId              String?
  verificationCode    String @unique
  issuedAt            DateTime?
  status              CertificateStatus @default(ELIGIBLE)
  conference          Conference @relation(fields: [conferenceId], references: [id])
  registration        Registration @relation(fields: [registrationId], references: [id])
  @@index([conferenceId, status])
}
```

## Check-in flow (SRS §17, verbatim)

```
QR Scan / Search -> Resolve Registration -> Validate registration status
  -> Record check-in timestamp -> Update attendance -> Optional: print badge
```

`Registration` gets a `qrCode` short code at `CONFIRMED` time (add
`qrCode String @unique` to the Phase 4 `Registration` model as part of
this phase's migration — it's introduced here because it's only needed
once check-in exists, keeping Phase 4's model focused on money, not event
operations). `POST /checkins` accepts either `{ qrCode }` or
`{ registrationNumber | email | phone }` (manual fallback, §17 bullet 2)
and resolves to exactly one `Registration`. Re-scanning the same
registration for the same `checkinType` is a no-op (`200`, not `409`) —
idempotent unless `allowReentry` is explicitly passed by a staff member
with the right permission, per §17 bullet: *"Check-in should be idempotent
unless re-entry is explicitly enabled."*

## Certificates: eligibility is a rule, not a manual toggle

```
certificate-eligibility.service.ts
  isEligible(type: CertificateType, registrationId): boolean
```

One evaluator per type, matching the §18 table exactly:

| Type | Eligibility rule |
|---|---|
| PARTICIPATION | `Registration.status = CONFIRMED` AND attendance ≥ conference-configured threshold |
| PRESENTATION | linked `Abstract.status = PRESENTED` for that registration's user |
| SPEAKER | `Speaker` linked to a `PUBLISHED` session via `SessionSpeaker` |
| REVIEWER | `Review` count ≥ conference-configured threshold |
| CHAIR | `SessionSpeaker.role IN (CHAIR, CO_CHAIR)` on a `PUBLISHED` session |
| WORKSHOP | workshop-category registration + a `Checkin` of type `WORKSHOP` |

A BullMQ job (post-event, and re-runnable) evaluates every registration
against every enabled type, writes `Certificate` rows at `ELIGIBLE`, then
a second job renders the PDF and moves them to `GENERATED`/`ISSUED`. The
public verification endpoint returns only
`{ certificateNumber, holderNameInitialOrFull(configurable), conferenceName, certificateType, issuedAt, status }`
— never the underlying `Registration`/`User` record, satisfying §18's
"reveal only the minimum information required."

## API surface

| Method & path | Purpose |
|---|---|
| `POST /api/v1/conferences/:id/sessions` | create session |
| `PATCH /api/v1/sessions/:id` | edit/reschedule |
| `POST /api/v1/sessions/:id/publish` | lock a stable public schedule version |
| `GET /api/v1/conferences/:id/program` | public/organizer schedule view |
| `POST /api/v1/conferences/:id/speakers` | create speaker profile |
| `PUT /api/v1/sessions/:id/speakers` | assign speakers/chairs/co-chairs |
| `POST /api/v1/sessions/:id/presentations` | assign an accepted abstract into the session |
| `POST /api/v1/checkins` | §17 QR scan / manual-search check-in |
| `GET /api/v1/conferences/:id/checkins` | event-day dashboard |
| `GET /api/v1/certificates/:id` | certificate detail (authenticated) |
| `GET /api/v1/certificates/verify/:code` | public verification, §18 minimum fields only |
| `POST /api/v1/conferences/:id/certificates/generate` | trigger eligibility + PDF job |

## Module & file structure (`apps/api/src/`)

```
sessions/           .module.ts .controller.ts .service.ts
  schedule-conflict.service.ts   # overlap checks: session times, speaker double-booking
speakers/           .module.ts .controller.ts .service.ts
presentations/      .module.ts .controller.ts .service.ts   # PresentationAssignment
checkins/           .module.ts .controller.ts .service.ts
attendance/         .module.ts .controller.ts .service.ts
certificates/
  certificates.module.ts .controller.ts .service.ts
  certificate-eligibility.service.ts
  certificate-pdf.processor.ts   # BullMQ processor in apps/worker
```

`apps/web/app/`:

```
conferences/[id]/program/           # organizer: session builder, drag-assign abstracts
conferences/[id]/speakers/
checkin/[conferenceId]/             # event-day staff: scan/search UI, large touch targets
verify/[code]/                      # public certificate verification page
```

## Business rules (SRS §15.1)

- Session `endTime > startTime` (`400` otherwise).
- A `PresentationAssignment`'s `startTime`/`endTime` must fall within its
  session's boundaries.
- `@@unique([sessionId, abstractId])` prevents the same abstract being
  double-booked into one session; `ScheduleConflictService` additionally
  checks the same abstract isn't assigned to two *different* sessions
  with overlapping times.
- Optional per-conference policy flag
  (`ConferenceSetting.preventSpeakerOverlap`, added this phase) — when on,
  assigning a `Speaker` to a session that overlaps another of their
  sessions is rejected.
- `Session.status = PUBLISHED` is the "stable public representation"
  §15.1 requires — once published, further edits create a new
  `scheduleVersion` marker on the conference rather than silently
  mutating what's already public (mirrors the abstract-versioning
  pattern from Phase 2, applied to the schedule).

## Testing focus

- Unit: schedule conflict detection (overlapping sessions, speaker
  double-booking, presentation-outside-session-bounds), all six
  certificate eligibility rules.
- Integration: full event-day path — confirmed registration → QR
  check-in → session attendance → certificate eligibility flips to
  `ELIGIBLE` → PDF job produces a verifiable `Certificate`.
- Load: check-in endpoint specifically (§34 Load row names it), since
  it's the one endpoint used under real time pressure by non-technical
  staff.

## Definition of Done

- [ ] Schedule builder prevents every overlap case listed in §15.1.
- [ ] Check-in is idempotent by default and measurably fast (organizer
  UX requirement in §35: "large touch targets, fast search").
- [ ] All six certificate types generate correctly and the public
  verification page never exposes more than the §18 minimum fields.
- [ ] Badge template supports name, type, organization and QR at minimum
  (§17 bullet).
