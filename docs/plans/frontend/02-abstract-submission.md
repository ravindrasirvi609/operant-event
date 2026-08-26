# Frontend Phase 2 — Abstract Submission

**Spec:** SRS §10–§11 (Abstract Submission, Authors), §35, §36.

**Depends on:** `frontend/00-foundation.md`, `frontend/01-...md` (tracks,
form-field builder). Backend Phase 2 (`AbstractsController`).

**Goal:** an author can draft, save versions of, add authors to, and
submit an abstract against a conference's live custom form fields; an
organizer can browse/search all submissions for a conference and
force-submit past deadline when authorized.

**Exit condition:** an author account with no organization membership at
all (author-facing routes carry no org context — confirmed:
`abstracts/mine`, `abstracts/:id/*` all run `JwtAuthGuard` only) can
submit a versioned abstract end-to-end through the UI.

---

## Route tree

```
app/(dashboard)/
  conferences/[conferenceId]/abstracts/page.tsx        # organizer: list/search
  conferences/[conferenceId]/abstracts/[abstractId]/page.tsx  # organizer: detail
(author)/                                               # separate group: no org shell/switcher
  my-abstracts/page.tsx                                 # GET abstracts/mine
  my-abstracts/[abstractId]/page.tsx                    # edit/version/submit/withdraw/authors
  conferences/[conferenceId]/abstracts/new/page.tsx     # POST conferences/:conferenceId/abstracts
```

The `(author)` group is deliberately **not** nested under `(dashboard)`:
those pages call author-facing routes that never send
`x-organization-id` and never check organization membership, so they
must not inherit `<AppShell>`'s org-switcher chrome, which would
misleadingly imply an org context these pages don't have. It gets its
own light layout (top nav, no org switcher, no sidebar).

## API surface consumed

| Page/action | Method & path | Notes |
|---|---|---|
| Create draft | `POST conferences/:conferenceId/abstracts` | `CreateAbstractDto`: `title`, `submissionType` (`ORAL\|POSTER\|E_POSTER\|WORKSHOP\|SYMPOSIUM`), `presentationPreference?`, `trackId?` |
| My abstracts | `GET abstracts/mine` | no org header |
| Save version | `PUT abstracts/:id/versions` | `SaveVersionDto`: same optional fields + required `formData: Record<string,unknown>` |
| Submit | `POST abstracts/:id/submit` | no body |
| Withdraw | `POST abstracts/:id/withdraw` | no body |
| Set authors | `PUT abstracts/:id/authors` | `{ authors: AuthorInputDto[] }`, min 1, each with `firstName`/`lastName` required |
| Organizer list | `GET conferences/:conferenceId/abstracts` | header, `ABSTRACT_READ` |
| Force-submit | `POST conferences/:conferenceId/abstracts/:id/force-submit` | header, `ABSTRACT_OVERRIDE_DEADLINE` |
| Active form fields | `GET conferences/:conferenceId/form-fields` | header, `CONFERENCE_READ` — **also called from the author-facing new-abstract page without an org header**, since the author needs the same field list; confirm with a manual test whether the backend route tolerates a missing header when the caller only needs read access, or whether a public/no-guard variant is needed — flag this as an integration risk to resolve during implementation, not something to guess into the plan. |

## Components

- `<AbstractWizard>` — multi-step: (1) basics (title/type/track/presentation
  preference, mirrors `CreateAbstractDto`), (2) dynamic form (renders
  `ConferenceFormField[]` from Phase 1's builder — same field-type
  switch as the organizer builder consumes, kept in one shared
  `lib/forms/dynamic-field-renderer.tsx` so the two never drift), (3)
  authors, (4) review & submit. Each step auto-saves via `PUT
  abstracts/:id/versions` on blur/step-change (SRS §35: "Submission forms
  should show progress, validation and save state") — a visible "Saved"/
  "Saving…"/"Save failed" indicator, not a silent background call.
- `<AuthorListEditor>` — repeatable author rows using
  `useFieldArray` (react-hook-form), each mirroring `AuthorInputDto`
  exactly; exactly one row can be marked "presenting" at a time per the
  backend's `validateAuthorFlags` — mirror that single-presenter
  constraint client-side (grep `abstract-authors.util.ts` for the exact
  rule before implementing) so the form never lets a user build a
  combination the backend will reject on submit.
- `<SubmissionProgress>` — step indicator + per-step validation state.
- `<AbstractStatusBadge>` — one badge component covering every
  `Abstract.status` value (`DRAFT`, `SUBMITTED`, `RESUBMITTED`,
  `SCREENING`, `UNDER_REVIEW`, `REVISION_REQUIRED`, `ACCEPTED`,
  `REJECTED`, `WAITLISTED`, `WITHDRAWN`) — text + color, reused by the
  organizer list, the author's "my abstracts" list, and Phase 3's review
  dashboard.
- `<OrganizerAbstractsTable>` — server-paginated (the backend list route
  has no visible pagination params in the current controller — confirm
  during implementation whether `findAllForOrganizer` supports
  `?page`/`?take`; if not, this is a backend gap worth flagging back
  rather than faking client-side pagination over an unbounded fetch),
  filter by status/track, search by title/submission number.
- `<ForceSubmitButton>` — only rendered when the caller has
  `ABSTRACT_OVERRIDE_DEADLINE`; uses `<ConfirmDialog>` (not typed —
  it's an administrative override, not a money/identity action).

## Business rules (UI-side)

- The wizard never lets a user reach the "review & submit" step with
  required custom fields empty — validation mirrors
  `abstract-form-validator.ts`'s `requireRequiredFields: true` pass,
  which only runs at submit time backend-side; the frontend runs the
  same check earlier (on the review step) purely for UX, and still
  handles a `400` from the real submit call gracefully (the backend is
  the actual authority).
- `EDITABLE_STATUSES` (`DRAFT`, `REVISION_REQUIRED`) gate whether
  `<AbstractWizard>` opens in edit mode vs. read-only — read the exact
  set from `apps/api/src/abstracts/abstracts.service.ts` rather than
  re-deriving it, since a mismatch here means a user either can't edit
  something they should be able to, or sees an editable form that 400s
  on save.
- Withdraw and force-submit both use `<ConfirmDialog>`; withdraw's copy
  makes clear it's not necessarily reversible (no "un-withdraw" endpoint
  exists backend-side) rather than implying otherwise.

## Testing focus

- Unit: dynamic field renderer against every `ConferenceFormField` type
  the builder can produce; single-presenting-author constraint in
  `<AuthorListEditor>`.
- E2E (Playwright, extends Phase 1's flow): as an author with no
  organization — register, view a published conference's abstract form,
  save a draft, add two authors (one presenting), submit, confirm it
  shows up under "my abstracts" as `SUBMITTED` with a real submission
  number.

## Definition of Done

- [ ] A brand-new user (no org membership) can complete the whole
  author flow — proves the `(author)` route group truly needs no org
  context anywhere in its call chain.
- [ ] Every `Abstract.status` value renders a distinct, accessible badge.
- [ ] Auto-save indicator never silently swallows a failed save — a
  failed `PUT .../versions` call surfaces as a visible retry prompt.

## Explicitly deferred

- Real-time collaborative co-author editing — not in the SRS for this
  phase; each author-list edit is a full `PUT` overwrite, matching the
  backend's `setAuthors` semantics (delete-then-recreate).
- Duplicate/similarity detection UI — SRS §40 future enhancement (AI).
