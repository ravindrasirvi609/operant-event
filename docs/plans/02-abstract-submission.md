# Phase 2 — Abstract Submission, Authors, Dynamic Form

**Spec:** SRS §10 (Abstract Management), §9's `ABS-*` requirements are
listed there too via §10.4.

**Depends on:** Phase 1 (`Conference`, `ConferenceTrack`, `File`,
`AuditLog`, tenant/permission guards).

**Goal:** a conference admin defines a per-conference submission form; an
author drafts, edits, adds co-authors to, and submits an abstract before
the conference deadline; every submitted revision is kept as an immutable
version.

**Exit condition (SRS §39):** *Authors can submit versioned abstracts
end-to-end.*

**Requirement IDs covered:** `ABS-001`…`ABS-010`.

---

## Data model

```prisma
enum AbstractStatus {
  DRAFT SUBMITTED SCREENING UNDER_REVIEW REVISION_REQUIRED RESUBMITTED
  ACCEPTED REJECTED WAITLISTED SCHEDULED PRESENTED WITHDRAWN
}
enum FormFieldType {
  TEXT LONG_TEXT RICH_TEXT NUMBER DATE SELECT MULTI_SELECT RADIO CHECKBOX FILE URL
}

model ConferenceFormField {
  id             String   @id @default(cuid())
  conferenceId   String
  section        String
  fieldKey       String
  label          String
  fieldType      FormFieldType
  isRequired     Boolean  @default(false)
  optionsJson    Json?
  validationJson Json?
  sortOrder      Int      @default(0)
  status         String   @default("ACTIVE") // ACTIVE | DISABLED — never deleted, see ABS-002 note below
  conference     Conference @relation(fields: [conferenceId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([conferenceId, fieldKey])
  @@index([conferenceId, status])
}

model Abstract {
  id                     String   @id @default(cuid())
  conferenceId           String
  trackId                String?
  submissionNumber       String
  title                  String
  submissionType         String   // ORAL | POSTER | E_POSTER | WORKSHOP | SYMPOSIUM
  presentationPreference String?
  status                 AbstractStatus @default(DRAFT)
  submittedBy            String   // User.id
  currentVersionId       String?
  submittedAt            DateTime?
  conference             Conference @relation(fields: [conferenceId], references: [id])
  track                  ConferenceTrack? @relation(fields: [trackId], references: [id])
  versions               AbstractVersion[]
  authors                AbstractAuthor[]
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  @@unique([conferenceId, submissionNumber])
  @@index([conferenceId, status])
  @@index([conferenceId, trackId])
}

model AbstractVersion {
  id            String   @id @default(cuid())
  abstractId    String
  versionNumber Int
  formData      Json     // keyed by ConferenceFormField.fieldKey
  submittedAt   DateTime @default(now())
  submittedBy   String
  abstract      Abstract @relation(fields: [abstractId], references: [id])
  @@unique([abstractId, versionNumber])
}

model Author {
  id          String @id @default(cuid())
  firstName   String
  lastName    String
  email       String?
  mobile      String?
  designation String?
  institution String?
  department  String?
  city        String?
  country     String?
  abstracts   AbstractAuthor[]
  createdAt   DateTime @default(now())
}

model AbstractAuthor {
  id             String  @id @default(cuid())
  abstractId     String
  authorId       String
  authorOrder    Int
  isCorresponding Boolean @default(false)
  isPresenting   Boolean @default(false)
  abstract       Abstract @relation(fields: [abstractId], references: [id])
  author         Author @relation(fields: [authorId], references: [id])
  @@unique([abstractId, authorId])
  @@index([abstractId])
}
```

`Author` is intentionally **not** the same record as `User` — an author
profile (name/institution/email) can exist without ever creating a login,
and one `User` submitting under slightly different name spellings across
conferences is a real scenario the SRS's persona model allows for. The
account that *owns* the submission (can edit/withdraw it) is
`Abstract.submittedBy`, a `User.id`.

`ConferenceFormField.status` is `ACTIVE`/`DISABLED`, never deleted — SRS
§10.2: *"Fields can be enabled or disabled without deleting historical
submitted values."* A disabled field simply stops rendering in new/edited
versions; old `AbstractVersion.formData` still contains its historical
value.

## Submission numbering (SRS §10.3)

`submissionNumber` is generated on first submit (not on draft creation),
formatted `A-{6-digit sequence}` per conference, using a
`Sequence`-style approach: a `SELECT ... FOR UPDATE` (or Postgres
`SERIAL`/advisory lock) scoped by `conferenceId` inside the same
transaction that flips status to `SUBMITTED` — never generated
client-side, never reused if a submission is later withdrawn.

## Module & file structure (`apps/api/src/`)

```
conference-form-fields/
  conference-form-fields.module.ts  .controller.ts  .service.ts
  dto/create-form-field.dto.ts  dto/reorder-form-fields.dto.ts
abstracts/
  abstracts.module.ts  .controller.ts  .service.ts
  dto/create-abstract.dto.ts  dto/save-version.dto.ts  dto/submit-abstract.dto.ts
  submission-number.service.ts
authors/
  authors.module.ts  .controller.ts  .service.ts
  dto/upsert-author.dto.ts  dto/reorder-authors.dto.ts
```

`apps/web/app/`:

```
conferences/[id]/abstracts/            # organizer: list + screening view
  form-builder/                        # organizer: drag/reorder form fields
submissions/                           # author-facing: my abstracts
submissions/[abstractId]/edit/         # dynamic form rendered from ConferenceFormField
```

The dynamic form renderer (`apps/web/components/abstract-form/`) takes the
`ConferenceFormField[]` for a conference and produces a Zod schema +
React Hook Form config at runtime — this is the one piece of Phase 2 that
justifies creating `packages/validation` (a shared field-type → Zod-schema
mapper used identically by the web form and the API's DTO validation, so
client and server never validate a field differently).

## API surface

| Method & path | Purpose |
|---|---|
| `GET /api/v1/conferences/:id/form-fields` | current active form definition |
| `POST /api/v1/conferences/:id/form-fields` | ABS-002 admin defines a field |
| `PATCH /api/v1/conferences/:id/form-fields/:fieldId` | edit / enable / disable |
| `PUT /api/v1/conferences/:id/form-fields/reorder` | sortOrder update |
| `POST /api/v1/conferences/:id/abstracts` | ABS-001 create draft |
| `GET /api/v1/abstracts/:id` | detail incl. current version + authors |
| `GET /api/v1/conferences/:id/abstracts` | organizer list (screening view) |
| `GET /api/v1/abstracts/mine` | author's own submissions |
| `PUT /api/v1/abstracts/:id/versions` | ABS-004 save a new version (draft edit) |
| `POST /api/v1/abstracts/:id/submit` | ABS-005/006 submit before deadline |
| `POST /api/v1/abstracts/:id/withdraw` | ABS-007 |
| `PUT /api/v1/abstracts/:id/authors` | ABS-003 add/edit/reorder co-authors |
| `POST /api/v1/abstracts/:id/attachments` | ABS-008 upload via `files` module |
| `GET /api/v1/conferences/:id/abstracts/export` | ABS-010 (queued job, returns download link) |

## Business rules

- **ABS-001**: `POST .../abstracts` creates `status: DRAFT` with no
  `AbstractVersion` yet required — a draft can exist with an empty form.
- **ABS-002**: the create/edit abstract endpoints validate `formData`
  against the conference's *currently active* `ConferenceFormField` set;
  unknown keys are rejected, required active fields must be present to
  submit (but not to save a draft).
- **ABS-003**: exactly one `AbstractAuthor.isPresenting = true` and at
  most one `isCorresponding = true` per abstract; validated on write.
- **ABS-004**: every `PUT .../versions` call, whether from a draft edit or
  a post-submit revision (Phase 3), inserts a new `AbstractVersion` row
  and updates `Abstract.currentVersionId` — rows are never updated in
  place.
- **ABS-005/006**: `submit` is blocked with `409` once
  `ConferenceSetting.abstractEndDate` has passed, **unless** the caller
  has `abstract.override_deadline` (an explicit admin permission, not a
  UI toggle) — satisfies "respect conference deadlines and explicit admin
  overrides."
- **ABS-007**: `withdraw` is only allowed while status is one of
  `DRAFT, SUBMITTED, SCREENING, UNDER_REVIEW, REVISION_REQUIRED` (not
  after `ACCEPTED`/`SCHEDULED`/`PRESENTED`) and is audit-logged.
- **ABS-009**: this phase does not yet expose any reviewer-facing views
  (Phase 3 builds those), but the `Abstract`/`AbstractVersion`/`Author`
  read paths used by Phase 3 must be designed so a "reviewer projection"
  can omit `Author` fields entirely when `ConferenceSetting.reviewMode`
  is blind — noted here so Phase 3 doesn't have to reshape this schema.

## Testing focus

- Unit: submission-number generator uniqueness under concurrent submit
  (two abstracts submitted in the same transaction window never collide);
  form-field-to-Zod-schema mapping for every `FormFieldType`.
- Integration: draft → edit → submit → version history is intact and
  queryable; deadline enforcement with and without override permission.
- API: cross-tenant abstract read/write blocked (author from conference A
  cannot see/edit an abstract in conference B, even within the same
  organization).

## Definition of Done

- [ ] All `ABS-*` requirements pass their stated acceptance criteria.
- [ ] Every historical `AbstractVersion` remains queryable after multiple
  edits and after a field is disabled.
- [ ] Submission numbers are unique per conference under concurrent load
  (covered by a test, not just code review).
- [ ] Author privacy groundwork (no author data leaking into any
  not-yet-built reviewer endpoint) is verified by contract, not assumption.
