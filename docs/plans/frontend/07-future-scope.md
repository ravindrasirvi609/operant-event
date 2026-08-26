# Frontend Phase 7 — Future Scope

**Spec:** SRS §39 (Phase 7 row), §40 (Future Enhancements), §37 (Mobile
and Responsive Requirements).

Mirrors `docs/plans/07-future-scope.md` on the backend side — this file
exists for the same reason: to name what's explicitly *not* being built
now, so it isn't silently assumed later.

## Why there's no native mobile app plan here

SRS §37: "The initial product is web-first and responsive... Participant
and event-day interfaces should be optimized for mobile browsers." Every
frontend phase in this plan set already treats mobile-responsive as the
default for participant/author/reviewer/check-in surfaces (Phase 0's
Global Constraints), so a native app is additive scope, not a gap the
web app leaves unusable in the meantime.

## Items from SRS §40 with a frontend-shaped footprint

- **AI-assisted abstract quality checks / reviewer recommendations** —
  would surface as inline suggestions in Phase 2's `<AbstractWizard>` and
  Phase 3's `<AssignmentBoard>`; no UI shape decided until the backend
  has a real model/service to call.
- **Native mobile app** — out of scope; see above.
- **WhatsApp communication integrations** — would extend Phase 6's
  `<EmailTemplateEditor>` pattern to a second channel; not started.
- **Multi-language conference sites** — would require an i18n layer
  (`next-intl` or equivalent) touching every phase's page — a
  cross-cutting change large enough to warrant its own phase-0-style
  foundation pass when it's actually prioritized, not a bolt-on.
- **Enterprise SSO/SAML** — would replace Phase 0's login page with an
  IdP redirect flow; the httpOnly-cookie session model in
  `docs/plans/frontend/00-foundation.md` is compatible with this later
  (SSO just changes how the initial tokens are obtained, not how they're
  stored/refreshed) — a reason to *not* revisit the cookie design when
  this eventually gets prioritized.
- **Offline-tolerant event-day check-in** — would change
  `<CheckinScanner>` (Phase 5) from "call the API" to "queue locally,
  sync when reconnected" — a meaningfully different architecture for
  that one component, not a small addition.

## Not planned at all

Public API/partner ecosystem, OpenSearch-backed search, data-residency
options — these are backend/infrastructure concerns with no frontend
shape to speak of yet.
