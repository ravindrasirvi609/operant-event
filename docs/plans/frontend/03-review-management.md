# Frontend Phase 3 — Review Management

**Spec:** SRS §12–§13 (Review Assignment, Review Submission), §25 (Blind
Review), §35, §36.

**Depends on:** `frontend/00-foundation.md`, `frontend/02-...md`
(`<AbstractStatusBadge>`). Backend Phase 3 (`ReviewersController`,
`ReviewAssignmentsController`, `ReviewsController`, `DecisionsController`).

**Goal:** an organizer/track-chair can add reviewers, assign/reassign
abstracts to them, and see an assigned/completed/overdue dashboard; a
reviewer sees only what blind-review mode allows and submits scored
reviews; a chair records the final accept/reject/revision/waitlist
decision, kept strictly separate from any individual review's
recommendation.

**Exit condition:** the full loop — assign → reviewer scores and submits
→ chair records a decision independent of the review's recommendation —
works end-to-end through the UI.

---

## Route tree

```
app/(dashboard)/
  conferences/[conferenceId]/reviewers/page.tsx           # organizer: reviewer roster
  conferences/[conferenceId]/review-assignments/page.tsx  # organizer: assign + dashboard
  conferences/[conferenceId]/abstracts/[abstractId]/decision/page.tsx  # chair: record decision
(reviewer)/
  my-reviews/page.tsx                     # GET review-assignments/mine
  my-reviews/[assignmentId]/page.tsx      # submit review / decline / declare conflict
```

`(reviewer)` is a separate group from `(dashboard)` for the same reason
as Phase 2's `(author)` group: `review-assignments/mine`,
`:id/decline`, `:id/declare-conflict`, and `:id/review` all run
`JwtAuthGuard` only, no org header, no `PermissionsGuard` — a reviewer
who is not an org member of anything still needs this UI to work.

## API surface consumed

| Page/action | Method & path | Notes |
|---|---|---|
| Reviewer roster | `GET reviewers` | header, `REVIEWER_MANAGE` |
| Add reviewer | `POST reviewers` | `AddReviewerDto { userId }` — **the UI needs a user-search/lookup step before this call**; no "add by email, create if missing" convenience exists backend-side, confirm during implementation whether a user-search endpoint exists anywhere or whether this has to be a manual userId entry for now |
| Update reviewer profile | `PUT reviewers/:reviewerId/profile` | `institution?, designation?, bio?, expertise?[], keywords?[]` |
| Assign | `POST conferences/:conferenceId/review-assignments` | `CreateAssignmentDto { abstractId, reviewerId, dueDate? }`, header, `REVIEW_ASSIGNMENT_MANAGE` |
| Reassign | `POST review-assignments/:id/reassign` | `ReassignDto { reviewerId, dueDate? }`, header, same permission |
| Dashboard counts | `GET conferences/:conferenceId/review-assignments/dashboard` | header, `ABSTRACT_READ` (not `REVIEW_ASSIGNMENT_MANAGE` — note the weaker permission the backend actually checks here) |
| My assignments | `GET review-assignments/mine` | no header |
| Decline | `POST review-assignments/:id/decline` | no header |
| Declare conflict | `POST review-assignments/:id/declare-conflict` | no header |
| Submit review | `POST review-assignments/:id/review` | `SubmitReviewDto`, no header |
| Record decision | `POST abstracts/:abstractId/decision` | `RecordDecisionDto { decision, reason? }`, header, `DECISION_RECORD` |
| Request revision | `POST abstracts/:abstractId/request-revision` | `RequestRevisionDto { reason, dueDate? }`, header, `DECISION_RECORD` |

## Components

- `<ReviewerRoster>` — table of `Reviewer` rows with expertise/keyword
  tags; `<ReviewerProfileForm>` for the profile fields above.
- `<AssignmentBoard>` — organizer view: abstracts needing assignment vs.
  assigned, with a reviewer picker that surfaces the backend's conflict
  check result (`ConflictOfInterestService`) as an inline warning
  *before* submitting — the assign call still enforces it server-side
  (`409` on a real conflict), so this is a UX head start, not the source
  of truth.
- `<ReviewDashboardCounts>` — the three numbers from `dashboard`
  (`assigned`/`completed`/`overdue`) as stat tiles; overdue rendered with
  both a color and an icon/label (SRS §36).
- `<ReviewerAssignmentCard>` (in `(reviewer)/my-reviews`) — shows due
  date, conflict-of-interest status, and — **only in `OPEN` review
  mode** — the submitting author's identity. In `SINGLE_BLIND`/
  `DOUBLE_BLIND` (whatever the exact `ReviewMode` enum values turn out to
  be — read `ConferenceSetting.reviewMode` and the backend projection
  logic in `review-assignments.service.ts`'s `toProjection` before
  building this card) the abstract's `submittedBy` is simply **absent**
  from the API response, not present-but-hidden — build the card so a
  missing field renders nothing rather than a placeholder like "Author:
  —", which would still leak "there is exactly one author" structurally
  where the spec wants no author information surfaced at all.
- `<ReviewScoreForm>` — five 1–5 integer scores
  (`overallScore`/`originalityScore`/`methodologyScore`/`significanceScore`/`presentationScore`)
  as a labeled radio/star-style control (not a bare number input —
  accessible labels per score dimension per SRS §36), `commentsToAuthor`
  (shown to the author later) visually distinguished from
  `privateComments` (chair-only) so a reviewer never confuses which text
  box is visible to whom, `recommendation` as a segmented control
  (`ACCEPT`/`REJECT`/`MINOR_REVISION`/`MAJOR_REVISION`).
- `<DecisionForm>` — **deliberately not pre-filled from any review's
  `recommendation`** (SRS §12: "Final decisions must remain separate from
  individual reviewer recommendations," already enforced backend-side by
  `recordDecision` taking the decision verbatim) — shown alongside a
  read-only summary of all submitted reviews' scores/recommendations for
  context, never as a suggested default value.
- `<RequestRevisionForm>` vs `<DecisionForm>`: separate forms/buttons,
  not a "REVISION_REQUIRED" option folded into one form — the backend
  models them as genuinely different operations
  (`AbstractRevisionRequest` vs `AbstractDecision`), and Phase 6's
  `abstract.revision_required` notification fires only from the former.

## Business rules (UI-side)

- `<ReviewerAssignmentCard>`'s decline/conflict actions use
  `<ConfirmDialog>` — both are one-way from the reviewer's side (only
  a chair can reassign after).
- The assignment board never shows an abstract's status alongside a
  reviewer-visible view in blind mode in a way that could imply
  authorship (e.g. never sort by submission order in a reviewer-facing
  list if that order could correlate with a track/session a reviewer
  already knows the makeup of) — this is a soft guideline for whoever
  builds the reviewer list ordering, not a hard backend-enforced rule,
  so call it out in review.

## Testing focus

- Unit: `<ReviewerAssignmentCard>` renders zero author-identity DOM nodes
  (not just visually hidden ones) when the API response omits
  `submittedBy` — assert on absence in the rendered tree, not on a CSS
  class, so a future refactor can't accidentally re-introduce a
  data leak through a "hidden" element still present in the DOM.
- E2E: chair adds a reviewer → assigns an abstract → reviewer (separate
  session/user) sees the assignment without author identity in blind
  mode → submits a review → chair sees the dashboard's `completed` count
  increment → chair records `ACCEPTED` independent of the review's
  `recommendation` value.

## Definition of Done

- [ ] Blind-mode author-identity omission verified by an automated DOM
  assertion, not a manual check.
- [ ] Decision and revision-request are visibly distinct actions/forms.
- [ ] Dashboard counts match what a direct API call to the same endpoint
  returns (no client-side derivation of `overdue` from assignment rows —
  always the backend's number, since `markOverdue`'s scan timing is a
  backend/worker concern this page must not try to replicate).

## Explicitly deferred

- Reviewer self-registration/application flow — SRS scope has organizers
  adding reviewers (`AddReviewerDto`), not open reviewer sign-up.
- AI-assisted reviewer recommendation — SRS §40 future enhancement.
