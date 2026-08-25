# Phase 3 — Reviewer Management, Assignments, Reviews, Decisions

**Spec:** SRS §11 (Peer Review Management), §12 (Decision and Revision
Management).

**Depends on:** Phase 2 (`Abstract`, `AbstractVersion`, `ConferenceTrack`).

**Goal:** conference/track admins assign reviewers to abstracts
(manually or by suggestion) while excluding conflicts, reviewers complete
a configurable scoring form under blind-review rules, and a track chair
records a final decision — separate from any individual reviewer's
recommendation — that can send an abstract back for revision.

**Exit condition (SRS §39):** *Complete review lifecycle works with blind
mode.*

**Requirement IDs covered:** `REV-001`…`REV-008`, plus §12.1 revision
requirements.

---

## Data model

```prisma
enum ReviewAssignmentStatus { PENDING IN_PROGRESS COMPLETED DECLINED OVERDUE CANCELLED }
enum ReviewRecommendation { ACCEPT REJECT MINOR_REVISION MAJOR_REVISION }
enum AbstractDecisionType { ACCEPTED REJECTED REVISION_REQUIRED WAITLISTED }

model Reviewer {
  id             String  @id @default(cuid())
  organizationId String
  userId         String
  status         String  @default("ACTIVE")
  profile        ReviewerProfile?
  assignments    ReviewAssignment[]
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
  @@unique([organizationId, userId])
}

model ReviewerProfile {
  id          String @id @default(cuid())
  reviewerId  String @unique
  institution String?
  designation String?
  bio         String?
  expertise   String[] // Postgres text[] via Prisma
  keywords    String[]
  reviewer    Reviewer @relation(fields: [reviewerId], references: [id])
}

model ReviewAssignment {
  id                  String   @id @default(cuid())
  conferenceId        String
  abstractId          String
  reviewerId          String
  assignedAt          DateTime @default(now())
  dueDate             DateTime?
  status              ReviewAssignmentStatus @default(PENDING)
  conflictOfInterest  Boolean  @default(false)
  reassignedFromId    String?  // self-relation: previous assignment, for audit history
  abstract            Abstract @relation(fields: [abstractId], references: [id])
  reviewer            Reviewer @relation(fields: [reviewerId], references: [id])
  review              Review?
  @@index([reviewerId, status])
  @@index([abstractId])
}

model Review {
  id                  String  @id @default(cuid())
  assignmentId        String  @unique
  overallScore        Int
  originalityScore    Int
  methodologyScore    Int
  significanceScore   Int
  presentationScore   Int
  commentsToAuthor    String?
  privateComments     String?
  recommendation      ReviewRecommendation
  submittedAt         DateTime @default(now())
  assignment          ReviewAssignment @relation(fields: [assignmentId], references: [id])
}

model AbstractDecision {
  id         String   @id @default(cuid())
  abstractId String
  decision   AbstractDecisionType
  reason     String?
  decidedBy  String   // User.id
  decidedAt  DateTime @default(now())
  abstract   Abstract @relation(fields: [abstractId], references: [id])
  @@index([abstractId])
}

model AbstractRevisionRequest {
  id          String   @id @default(cuid())
  abstractId  String
  requestedBy String
  reason      String
  dueDate     DateTime?
  resolvedAt  DateTime?
  abstract    Abstract @relation(fields: [abstractId], references: [id])
  createdAt   DateTime @default(now())
}
```

`Review` scores are `1-5` integers validated at the DTO layer (SRS §11.2
table); the exact scoring rubric fields (`originality`, `methodology`,
`significance`, `presentation quality`, `overall`) match the SRS table
verbatim rather than the slightly different field set in the old
`docs/temp-chatgpt-2.txt` notes — the SRS supersedes those notes wherever
they disagree.

## Blind review: how "no author data" is actually enforced

Adding a scope filter *is not enough* on its own — REV-004 needs to be
provable. This phase introduces a **reviewer projection** at the service
layer: `AbstractsService.findForReviewer(assignmentId)` returns a
different, narrower shape than `AbstractsService.findForOrganizer(id)` —
the reviewer projection never selects `AbstractAuthor`/`Author` fields at
all when `ConferenceSetting.reviewMode !== 'OPEN'`, rather than fetching
full data and hiding fields in the controller/serializer. A DTO-shape
test (not just a UI test) asserts the reviewer projection's TypeScript
type has no author-identifying fields when blind mode is on.

## Module & file structure (`apps/api/src/`)

```
reviewers/
  reviewers.module.ts  .controller.ts  .service.ts
  dto/create-reviewer-profile.dto.ts
review-assignments/
  review-assignments.module.ts  .controller.ts  .service.ts
  dto/create-assignment.dto.ts  dto/reassign.dto.ts
  conflict-of-interest.service.ts   # institution/author/previous-collaboration checks
  reviewer-suggestion.service.ts    # keyword/track-based candidate ranking
reviews/
  reviews.module.ts  .controller.ts  .service.ts
  dto/submit-review.dto.ts
decisions/
  decisions.module.ts  .controller.ts  .service.ts
  dto/record-decision.dto.ts  dto/request-revision.dto.ts
```

`apps/web/app/`:

```
conferences/[id]/reviewers/         # organizer: reviewer directory, assignment board
conferences/[id]/abstracts/[abstractId]/decision/   # track chair decision screen
reviews/my/                          # reviewer-facing: assigned reviews, due dates
```

## API surface

| Method & path | Purpose |
|---|---|
| `POST /api/v1/conferences/:id/reviewers` | REV-001 add/invite a reviewer |
| `PUT /api/v1/reviewers/:id/profile` | expertise/affiliation |
| `GET /api/v1/conferences/:id/reviewers/suggestions?abstractId=` | ranked candidates, conflicts pre-excluded |
| `POST /api/v1/review-assignments` | REV-002 manual assignment (single or bulk) |
| `POST /api/v1/review-assignments/:id/reassign` | REV-002, keeps history via `reassignedFromId` |
| `POST /api/v1/review-assignments/:id/decline` | reviewer declines |
| `PUT /api/v1/reviewers/me/conflicts` | REV-003 declare a standing conflict |
| `GET /api/v1/reviews/my` | reviewer's assigned reviews (uses the blind-review projection) |
| `POST /api/v1/review-assignments/:id/review` | REV-005/006 submit score form (one-shot) |
| `GET /api/v1/conferences/:id/reviews/dashboard` | REV-008 assigned/completed/overdue counts |
| `POST /api/v1/abstracts/:id/decision` | record final `AbstractDecision` |
| `POST /api/v1/abstracts/:id/request-revision` | §12.1 creates `AbstractRevisionRequest`, sets status `REVISION_REQUIRED` |

## Business rules

- **REV-002/REV-003**: assignment creation runs
  `ConflictOfInterestService.check(reviewerId, abstractId)` — same
  institution, same declared author, prior collaboration flag, or an
  explicit standing conflict — and refuses (`409`, listing the reason) to
  create a conflicted assignment rather than silently skipping it.
- **REV-004**: enforced via the reviewer projection described above, not
  just field-level UI hiding (SRS §28: "UI hiding is not a security
  control").
- **REV-006**: `POST .../review` is rejected with `409` if a `Review`
  already exists for that assignment — reviews are immutable once
  submitted; a correction requires an explicit, separately-permissioned
  "reopen" action that is audit-logged, not a silent overwrite.
- **§12**: `AbstractDecision` is written by a track chair/admin action,
  never derived automatically from `Review.recommendation` — multiple
  reviews can disagree; a human decision is always required.
- **§12.1**: `request-revision` always creates a *new*
  `AbstractRevisionRequest` and moves `Abstract.status` to
  `REVISION_REQUIRED`; the author's next `PUT .../versions` call (Phase 2
  endpoint) naturally creates version N+1 — no abstract content is ever
  overwritten, and accepting later must reference
  `Abstract.currentVersionId` at time of acceptance (recorded on the
  `AbstractDecision`, add `effectiveVersionId` to that model here rather
  than inferring it later).
- **REV-007**: due/overdue reminders are a BullMQ scheduled job
  (`apps/worker`) that flips `PENDING → OVERDUE` past `dueDate` and
  enqueues a notification (Phase 6 owns the actual notification delivery
  — this phase only needs the job to exist and be idempotent per
  assignment per day).

## Testing focus

- Unit: conflict-of-interest rule matrix, decision state-machine
  validity, scoring bounds validation.
- Integration: full lifecycle — assign (excluding conflicted reviewers) →
  review → decision `REVISION_REQUIRED` → author resubmits (Phase 2 path)
  → re-review → `ACCEPTED`, with every step's audit log present.
- API/Security: a reviewer's API response never contains
  `Author`/`AbstractAuthor` fields when the conference is in
  `DOUBLE_BLIND`/`SINGLE_BLIND` mode — asserted on the raw JSON, not just
  the UI.

## Definition of Done

- [ ] All `REV-*` requirements pass their stated acceptance criteria.
- [ ] Blind-review guarantee is covered by an automated contract test
  (SRS §34.1 release blocker: "Reviewer can see protected data in
  blind-review mode").
- [ ] Decision and revision history is fully reconstructable from
  `AbstractDecision` + `AbstractRevisionRequest` + `AbstractVersion` rows.
- [ ] Overdue-review job runs, is idempotent, and is observable (SRS §32).
