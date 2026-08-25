# Phase 7 — Future Scope (AI, Mobile, Integrations)

**Spec:** SRS §39 (Phase 7 row), §40 (Future Enhancements), §42.3 (Open
Decisions to Finalize Before Production).

**Depends on:** Phases 0–6 shipped and stable — every item here is
additive to a working platform, not a prerequisite for one.

**Exit condition (SRS §39):** *Advanced differentiation and scale
features.*

This file is deliberately **not** shaped like Phases 0–6. Those phases
have committed data models and endpoint lists because the SRS specifies
them concretely. Phase 7 is explicitly the SRS's "later/advanced" bucket —
locking a Prisma schema for AI reviewer-recommendation embeddings today,
before Phases 1–6 exist to generate the data those features would learn
from, would be designing for a hypothetical. What belongs here instead:
what each item is, why it's deferred, and what signal should trigger
picking it up.

---

## 1. Open decisions to close before any of this starts (SRS §42.3)

These block production readiness generally, not just Phase 7, but they're
listed here because several Phase 7 items can't be scoped until they're
answered:

| # | Decision | Affects |
|---|---|---|
| 1 | Custom auth vs. managed identity provider for enterprise customers | Enterprise SSO/SAML (§4 below) |
| 2 | AWS S3 vs. Cloudflare R2 | All `File`/object-storage code from Phase 1 onward |
| 3 | Vercel + managed backend vs. AWS from day one | Deployment/CI work started in Phase 0 |
| 4 | Razorpay-first, Stripe-first, or both at launch | Phase 4's payment provider adapter |
| 5 | Certificate template engine / PDF generation approach | Phase 5's certificate PDF job |
| 6 | Tenant subdomains vs. custom domains vs. both for public conference sites | Public-site routing, not yet built in any phase |
| 7 | Data retention periods by entity and target jurisdiction | Privacy/compliance tooling (§3 below) |
| 8 | Enterprise SSO/SAML and org-level audit exports scope | §4 below |

Each should be answered (owner: Product/Engineering per SRS's Approval &
Ownership table) before the phase that depends on it starts — most are
Phase 0/1/4/5 blockers, not Phase 7 blockers, which is why they're
surfaced here rather than silently deferred with everything else.

## 2. AI-assisted features (SRS §40, §41 "AI ko decision maker nahi,
recommendation system ki tarah use karna" from the original design notes —
kept as a hard constraint below)

| Feature | What it does | Depends on |
|---|---|---|
| Abstract quality checks | Flags missing sections, weak methodology language, keyword suggestions at submission time | Enough historical `AbstractVersion` data to be worth building against (Phase 2) |
| Reviewer recommendation | Ranks candidate reviewers by expertise-keyword match against an abstract | `ReviewerProfile.expertise`/`keywords` (Phase 3) — the *manual* keyword-matching version already exists in Phase 3's `reviewer-suggestion.service.ts`; this is that service getting a learned/embedding-based upgrade, not a new system |
| Duplicate/similarity detection | Flags likely-duplicate submissions via text embeddings | Needs a vector-similarity store (e.g. pgvector) added to Postgres — a real infra decision, not a Phase 7 afterthought |
| AI program clustering | Suggests session groupings/schedule from accepted abstracts | Phase 5's `Session`/`PresentationAssignment` data |

**Hard constraint carried over from the original design discussion:** AI
never makes a final accept/reject/schedule decision — every AI output in
this list is a suggestion surfaced to a human who still calls the actual
API endpoint (`decisions`, `presentations`, etc.) from earlier phases.
This isn't a new integration point; it's a ranking/suggestion layer in
front of endpoints that already exist.

## 3. Compliance & data lifecycle (SRS §29, §38, referenced but not fully
built in earlier phases)

- Configurable per-entity retention windows and anonymization tooling
  (§29) — deferred here because SRS §29 explicitly says exact legal
  obligations depend on customer geography, i.e. this needs open decision
  #7 above answered first, market by market.
- Full data export for a customer's own organization admin (distinct
  from Phase 6's internal report exports) — same retention-policy
  dependency.

## 4. Enterprise & scale features (SRS §40)

- Enterprise SSO/SAML — depends on open decision #1.
- Multi-language conference sites — no public conference site exists in
  Phases 0–6 to localize yet; revisit once one does.
- OpenSearch for advanced cross-field search — SRS §25 explicitly frames
  this as the upgrade path *from* Postgres full-text search once volume
  justifies it, not a day-one requirement. Trigger: search latency or
  relevance complaints against the Phase 2/6 Postgres-backed search.
- Public API and partner ecosystem — needs the internal API (Phase 1
  onward) to have been stable and versioned in production for a while
  first; opening it externally before that is premature surface area.
- Offline-tolerant event-day check-in — only worth building after real
  Phase 5 check-in usage surfaces actual connectivity failures at a venue;
  building offline-first speculatively risks the exact
  "over-customization"/scope-explosion risk SRS §42.2 warns about.

## 5. Native mobile & messaging (SRS §40)

- Native iOS/Android app — explicitly Out of Scope for MVP (§3.2); the
  web app is mobile-responsive by design (§37) as the interim answer.
- WhatsApp integration — additive channel on top of Phase 6's
  notification pipeline (`notifications` module already abstracts
  channel from trigger; adding a WhatsApp provider there is a smaller
  change than it looks once Phase 6 exists).

## 6. Advanced CRM for exhibitors/sponsors (SRS §40)

Phase 6 ships basic sponsor/exhibitor CRUD. A full CRM (pipeline stages,
communication history, renewal tracking) is deferred until there's
evidence organizers are managing sponsors outside the product because
Phase 6's version isn't enough — not built speculatively ahead of that
signal.

## How to pick up an item from this file

1. Confirm the open decision(s) it depends on (§1 above) are actually
   closed.
2. Run the `writing-plans` skill against *that specific item* — at that
   point it has a real dependency graph (existing tables, existing
   endpoints from Phases 0–6) to plan against, which is exactly the
   information this file intentionally doesn't try to guess today.
3. Treat it as its own phase-sized plan, sized the same way
   `01-auth-organization-rbac-conference.md` through
   `06-reports-sponsors-notifications.md` are — this file is the backlog;
   the moment an item is actually scheduled, it earns its own numbered
   plan file like the others.
