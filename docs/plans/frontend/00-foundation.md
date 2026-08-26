# Frontend Phase 0 — Foundation

**Spec:** `docs/Operant_Event_Conference_SaaS_SRS.docx` §6 (System Context),
§31 (Error Handling and Resilience), §32 (Observability), §33 (DevOps),
§34 (QA and Testing Strategy), §35 (UX/UI Requirements), §36
(Accessibility), §37 (Mobile and Responsive Requirements).

**Depends on:** `apps/api` Phases 0–1 (auth + organization + conference
already exist and are the first things this phase's plumbing calls).

**Goal:** every later frontend phase plugs into one already-solved BFF
(backend-for-frontend) layer — auth cookies, the active-organization
header, a typed API client, a design-system shell, and a test harness —
instead of re-solving "how do I call the API" seven times.

**Exit condition:** a logged-in user can load an authenticated shell page
that round-trips through the real `apps/api` (list their organizations),
with cookies, headers, loading/error/empty states, and CI all wired.

---

## Current status

**Already scaffolded** (do not redo): Next.js 16 (App Router) + React 19 +
TypeScript, Tailwind v4, shadcn/ui (`components.json`, style `base-nova`,
`@base-ui/react` primitives, `lucide-react` icons), `@tanstack/react-query`,
`zustand`, `react-hook-form` + `@hookform/resolvers` + `zod`. A handful of
shadcn primitives already exist under `apps/web/components/ui/`
(`button`, `input`, `select`, `dialog`, `dropdown-menu`, `table`, `tabs`).

**Not yet done, all of it this phase:**
- No auth wiring of any kind — no login page, no cookie handling, no API
  client.
- No route groups / layout shell.
- No test tooling (`apps/web/package.json` has no test runner at all).
- No `.env.example` for `apps/web`.
- No Playwright / E2E scaffold.

## Real backend contract this phase wires against

Confirmed by reading the implemented controllers directly (not the
original backend plan sketches, which drifted slightly in a few places):

- **Global API prefix:** every backend route is under `/api/v1` —
  `apps/api/src/main.ts` calls `app.setGlobalPrefix('api/v1')`.
- **Auth:** `POST auth/register`, `POST auth/login`, `POST auth/refresh`,
  `POST auth/logout`, `POST auth/verify-email`, `POST
  auth/password-reset/request`, `POST auth/password-reset/confirm`, `GET
  auth/sessions`, `DELETE auth/sessions/:id`. Login/refresh return an
  access token (15 min default TTL, `JWT_ACCESS_TTL_SECONDS`) and a
  refresh token (30 day default, `JWT_REFRESH_TTL_DAYS`) — confirmed in
  `packages/config/src/env.ts`.
- **Active organization:** every organization-scoped route requires an
  `x-organization-id` header (exact lowercase literal —
  `apps/api/src/common/guards/permissions.guard.ts`:
  `ORGANIZATION_HEADER = 'x-organization-id'`). Missing/invalid header on
  a route that needs it → `403`. This is **not** inferred from the JWT —
  the frontend is responsible for always sending it once a user has an
  active organization selected.
- **Permissions:** `PermissionsGuard` throws `403 Forbidden` (not `404`)
  listing the missing permission keys. The full catalogue lives in
  `apps/api/src/common/permissions/permissions.catalogue.ts` — mirror it
  client-side (Task 4) so the UI can hide actions a role can't perform
  instead of only reacting to a `403` after the fact.
- **Known drift to design around, not silently "fix":**
  `OrganizationsController.update/inviteMember/updateMembership/listRoles`
  and `RolesController.create` take the target organization as a **path
  param** (`:id` / `:organizationId`), while `PermissionsGuard` still
  requires the `x-organization-id` **header** to be present and match an
  active membership. The frontend must send both, and they must agree —
  build the org-admin pages so the header is always derived from the same
  active-organization state as the path param, never independently.

## Architecture decisions for this phase

### 1. Auth: httpOnly-cookie BFF, tokens never touch client JS

Given a bearer-token backend (not itself cookie-based), the production-grade
pattern for Next.js App Router is a thin server-side proxy that is the
*only* thing holding the tokens:

```
Browser                          Next.js server (apps/web)                 apps/api
  |  fetch('/api/proxy/...')  ->  Route Handler reads httpOnly cookies  ->  Authorization: Bearer <access>
  |                                 attaches x-organization-id             x-organization-id: <activeOrgId>
  |  <-  JSON response         <-  forwards response verbatim         <-
```

- `access_token` and `refresh_token` are set as `httpOnly`, `Secure`
  (prod), `SameSite=Lax` cookies by three Route Handlers that call the
  real auth endpoints: `app/api/auth/login/route.ts`, `.../refresh/route.ts`,
  `.../logout/route.ts` (clears cookies + calls `POST auth/logout`).
- **No middleware-based silent refresh.** Edge middleware has limited
  Node API access and makes "retry the original request with a new
  token" awkward. Instead, the single catch-all proxy handler
  (`app/api/proxy/[...path]/route.ts`) does refresh-on-401 itself: forward
  the request; if the backend returns `401`, call `auth/refresh` once
  using the `refresh_token` cookie, set the new cookies on the outgoing
  response, and retry the original request exactly once. A second `401`
  means the refresh token itself is dead — return `401` to the client and
  let the client-side query layer redirect to `/login`.
- `middleware.ts` still exists, but only for **route protection**, not
  token refresh: it checks whether `access_token` or `refresh_token` is
  present (a lightweight synchronous check, no network call) and redirects
  unauthenticated requests to `(dashboard)` routes to `/login`. It never
  decodes or verifies the JWT — that's the backend's job on every call.
- **Active organization** is a separate, non-secret, non-httpOnly cookie
  (`active_org_id` — a cuid, not a capability) set client-side when the
  user switches organizations. The proxy handler reads it and attaches it
  as `x-organization-id` on every forwarded request. A logged-in user with
  no `active_org_id` cookie yet (first login) gets it set to their first
  organization membership, resolved server-side in the post-login
  Route Handler by calling `GET organizations/me`.

### 2. Two calling conventions, not one — Server Components vs. client mutations

- **Server Components** (initial page loads, SSR'd lists/detail pages):
  call `apps/api` **directly** from the server using a small helper that
  reads the httpOnly cookies via `next/headers` and builds the same two
  headers. No proxy hop needed — the RSC render already runs server-side.
- **Client Components** (forms, mutations, polling, anything driven by
  `@tanstack/react-query`): always go through
  `app/api/proxy/[...path]/route.ts` (same-origin fetch from the browser,
  so the httpOnly cookies are sent automatically by the browser itself and
  never touched by JS). This is also where the refresh-on-401 retry lives,
  so client mutations get free silent-refresh; Server Component reads
  don't need it as often (a stale page reload is cheap) but redirect to
  `/login` on a `401` via a shared error boundary.

### 3. File structure

```
apps/web/
  middleware.ts                          # route-group protection only
  app/
    (public)/
      login/page.tsx
      register/page.tsx
      verify-email/page.tsx
      password-reset/page.tsx
      password-reset/confirm/page.tsx
    (dashboard)/
      layout.tsx                         # org switcher, nav shell, requires session
      page.tsx                           # organizer landing (Phase 1)
    api/
      auth/login/route.ts
      auth/logout/route.ts
      auth/refresh/route.ts
      proxy/[...path]/route.ts           # generic authenticated backend proxy
  lib/
    api/
      backend.ts                        # base URL, shared fetch error type
      server-client.ts                  # for Server Components (direct call + cookies)
      client.ts                         # for Client Components (calls same-origin proxy)
      permissions.ts                    # PERMISSIONS mirror + hasPermission() helper
    auth/
      session.ts                       # server-only: getSession() from cookies
      cookies.ts                       # cookie names + set/clear helpers
    org/
      active-org.store.ts              # zustand store, hydrated from active_org_id cookie
  components/
    shell/app-shell.tsx
    shell/org-switcher.tsx
    shell/nav.tsx
    query/query-provider.tsx            # QueryClientProvider + default options
    query/async-boundary.tsx            # shared loading/error/empty wrapper (§41 DoD)
  hooks/
    use-session.ts
    use-active-organization.ts
  e2e/                                  # Playwright specs, added Task 6
```

### 4. Shared response/error contract

`apps/api`'s Nest exception filters return `{ statusCode, message, error? }`
(default Nest shape — nothing custom was added backend-side). The client
wraps every proxy/server call in one helper that normalizes this into a
typed `ApiError` so every page can render the same error state instead of
each hand-rolling `try/catch`:

```ts
// lib/api/backend.ts
export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, body.message ?? 'Request failed', body);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
```

`components/query/async-boundary.tsx` is the single place that turns
`isPending`/`isError`/`data.length === 0` into the loading/error/empty UI
states SRS §41's Definition of Done requires on every screen — every
later phase's list/detail page wraps its query result in this instead of
writing its own three-state branch.

## Global Constraints (apply to every later frontend phase)

- Never call `apps/api` directly from a Client Component with `fetch` —
  always through `lib/api/client.ts` (proxy) so tokens stay server-side.
- Every organization-scoped page reads the active organization from
  `useActiveOrganization()`, never from a locally re-derived value — one
  source of truth, matching the header/path-param drift warning above.
- Every list/detail page uses `AsyncBoundary` — no bespoke loading spinner
  per page.
- Every destructive action (withdraw abstract, refund payment, reject
  registration, revoke session, remove exhibitor staff, delete anything)
  uses the shared `<ConfirmDialog>` component (Task 3), and for
  high-impact ones (refund, decision recording) requires typed
  confirmation (SRS §35: "Destructive operations require confirmation
  and, where practical, typed confirmation for high-impact actions").
- Accessibility (SRS §36) is enforced at the component level, not
  audited after the fact: every form field uses a `<Label htmlFor>` pair
  (shadcn `Form` primitives already do this), every status badge pairs
  color with text/icon (never color alone), every `<Dialog>`/`<Table>`
  comes from the shadcn primitives already vetted for
  keyboard/focus/ARIA behavior rather than a hand-rolled modal.
- Mobile-first for participant/event-day surfaces, tablet-minimum for
  organizer back-office surfaces (SRS §37) — Tailwind breakpoints, no
  desktop-only fixed-width layouts.

---

## Tasks

### Task 1: `apps/web/.env.example` and env validation

**Files:**
- Create: `apps/web/.env.example`
- Create: `apps/web/lib/env.ts`

- [ ] `.env.example`: `BACKEND_API_URL=http://localhost:3001/api/v1` (server-only,
  used by Route Handlers and Server Components — never exposed to the
  browser, so no `NEXT_PUBLIC_` prefix), `COOKIE_DOMAIN` (optional, prod
  multi-subdomain), `NODE_ENV`.
- [ ] `lib/env.ts` mirrors `packages/config`'s pattern: a small Zod schema
  + `loadEnv()` that throws a readable error at startup rather than
  failing later with `undefined` string concatenation into a URL.
- [ ] Do **not** add `@operant-event/config` as a dependency of `apps/web`
  — that package's schema is `DATABASE_URL`/`JWT_*`/Redis, none of which
  the frontend needs or should have access to.

### Task 2: Auth cookie plumbing

**Files:**
- Create: `apps/web/lib/auth/cookies.ts`
- Create: `apps/web/lib/auth/session.ts`
- Create: `apps/web/app/api/auth/login/route.ts`
- Create: `apps/web/app/api/auth/refresh/route.ts`
- Create: `apps/web/app/api/auth/logout/route.ts`

- [ ] `cookies.ts` exports `ACCESS_TOKEN_COOKIE`, `REFRESH_TOKEN_COOKIE`,
  `ACTIVE_ORG_COOKIE` name constants and `cookieOptions()` returning
  `{ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }`
  (httpOnly **false** for `ACTIVE_ORG_COOKIE` only — it's not a secret).
- [ ] `POST app/api/auth/login/route.ts`: calls `POST auth/login` on the
  real backend, on success sets `access_token`/`refresh_token` cookies
  from the response body, then calls `GET organizations/me` (server-side,
  with the just-issued access token) to resolve a default
  `active_org_id` if the client didn't send one, and returns `{ user, organizations }`
  to the browser (never the raw tokens).
- [ ] `POST app/api/auth/refresh/route.ts`: reads `refresh_token` cookie,
  calls `POST auth/refresh`, re-sets both cookies. Used by the proxy's
  refresh-on-401 path (Task 3) and by a manual "refresh" call if ever
  needed.
- [ ] `POST app/api/auth/logout/route.ts`: reads `refresh_token`, calls
  `POST auth/logout` (fire-and-forget — clear cookies regardless of the
  backend call's outcome, a user must always be able to log out client-side
  even if the backend is unreachable), clears all three cookies.
- [ ] `session.ts`: server-only `getSession()` reads the `access_token`
  cookie and returns `{ isAuthenticated: boolean }` — it does **not**
  decode the JWT payload for identity; identity comes from calling
  `GET organizations/me` (Phase 1) when a page actually needs the user's
  name/email, keeping one source of truth instead of two.

### Task 3: The generic authenticated proxy

**Files:**
- Create: `apps/web/app/api/proxy/[...path]/route.ts`
- Create: `apps/web/lib/api/backend.ts`
- Create: `apps/web/lib/api/client.ts`

- [ ] The proxy handler exports `GET`/`POST`/`PATCH`/`PUT`/`DELETE`, each
  delegating to one `forward(request, path)` function: builds the target
  URL (`${BACKEND_API_URL}/${path}`), copies the incoming method/body
  (raw stream for multipart, so file uploads pass through unchanged),
  attaches `Authorization: Bearer <access_token>` and, if the
  `active_org_id` cookie is set, `x-organization-id`.
- [ ] On a `401` response from the backend: call the refresh logic
  in-process (not via an internal HTTP round-trip to Task 2's route —
  factor the refresh call into a shared `lib/auth/refresh.ts` function
  both call), set the new cookies on the outgoing `NextResponse`, retry
  the original forwarded request once. A second `401` passes through
  as-is.
- [ ] `lib/api/client.ts` is what every `@tanstack/react-query`
  hook uses: `apiGet<T>(path)`, `apiPost<T>(path, body)`,
  `apiPatch/apiPut/apiDelete`, all calling `fetch('/api/proxy/' + path, ...)`
  (same-origin, relative — no `BACKEND_API_URL` reference on the client
  bundle at all) and running the response through `parseApiResponse`.
- [ ] `lib/api/server-client.ts` (companion, for Server Components):
  same shape (`apiGet`/`apiPost`/...) but calls `BACKEND_API_URL` directly
  server-side and reads cookies via `next/headers` for the two headers —
  no refresh-on-401 here (a stale SSR'd page is refetched on next
  navigation; don't duplicate the retry logic server-side too).

### Task 4: Permissions mirror + `<AsyncBoundary>` + `<ConfirmDialog>`

**Files:**
- Create: `apps/web/lib/api/permissions.ts`
- Create: `apps/web/components/query/async-boundary.tsx`
- Create: `apps/web/components/ui/confirm-dialog.tsx`

- [ ] `permissions.ts`: a literal copy of the 23-key `PERMISSIONS` object
  from `apps/api/src/common/permissions/permissions.catalogue.ts` (kept in
  sync by hand — see "Explicitly deferred" for why not shared via a
  package yet) plus `hasPermission(effectivePermissions: string[], key: string): boolean`.
- [ ] `AsyncBoundary<T>({ query, children, empty })`: given a
  `UseQueryResult<T>`, renders a skeleton while `isPending`, a retry-able
  error card while `isError` (using the `ApiError` message), the `empty`
  slot when `data` is an empty array/null, otherwise `children(data)`.
- [ ] `ConfirmDialog`: shadcn `Dialog` wrapper taking `title`,
  `description`, `confirmLabel`, `onConfirm`, and an optional
  `requireTypedConfirmation?: string` (when set, the confirm button stays
  disabled until the user types that exact string — used by refund/decision
  actions in later phases).

### Task 5: Auth pages + dashboard shell

**Files:**
- Create: `apps/web/app/(public)/login/page.tsx`
- Create: `apps/web/app/(public)/register/page.tsx`
- Create: `apps/web/app/(public)/verify-email/page.tsx`
- Create: `apps/web/app/(public)/password-reset/page.tsx`
- Create: `apps/web/app/(public)/password-reset/confirm/page.tsx`
- Create: `apps/web/app/(dashboard)/layout.tsx`
- Create: `apps/web/components/shell/app-shell.tsx`
- Create: `apps/web/components/shell/org-switcher.tsx`
- Create: `apps/web/hooks/use-session.ts`
- Create: `apps/web/hooks/use-active-organization.ts`
- Create: `apps/web/middleware.ts`

- [ ] Login/register forms: `react-hook-form` + `zod` schemas mirroring
  `LoginDto`/`RegisterDto` exactly (`email`, `password` min length 10 for
  register, `firstName`/`lastName`) — client-side validation errors must
  match what the backend would reject, so a user never submits something
  the API is guaranteed to bounce.
- [ ] Register success → redirect to a "check your email to verify"
  screen (matches `POST auth/verify-email` existing as a separate step,
  not auto-login).
- [ ] `(dashboard)/layout.tsx`: Server Component, calls `getSession()`;
  redirects to `/login` if unauthenticated (belt-and-suspenders with
  `middleware.ts`), otherwise fetches `GET organizations/me` and renders
  `<AppShell>` with the org list handed to `<OrgSwitcher>`.
- [ ] `<OrgSwitcher>`: on selection, sets the `active_org_id` cookie
  (client-side `document.cookie` — it's not httpOnly) and invalidates
  every `@tanstack/react-query` query (`queryClient.invalidateQueries()`)
  so the whole shell refetches under the new organization context.
- [ ] `middleware.ts`: matches `(dashboard)/*`; redirects to `/login` if
  neither cookie is present. Matches `(public)/login|register` the other
  way (redirect an already-authenticated user straight to the dashboard).

### Task 6: Test tooling

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Create: `apps/web/playwright.config.ts`
- Modify: `apps/web/package.json`

- [ ] Add `vitest`, `@vitejs/plugin-react`, `@testing-library/react`,
  `@testing-library/jest-dom`, `jsdom` as dev dependencies; `test`/`test:watch`
  scripts.
- [ ] Add `@playwright/test` as a dev dependency; `test:e2e` script;
  `apps/web/e2e/` directory with one smoke spec (Task 7) — matches SRS
  §34's "E2E: Playwright — author submission, reviewer review,
  registration, check-in" row; each later phase adds its named flow here.
- [ ] Wire both into the root `turbo.json` (`test`, `test:e2e` tasks) so
  `pnpm --filter web test` and the CI pipeline from `docs/plans/00-foundation.md`
  Task 5 can run them — extend that CI job to add a `web` matrix leg,
  don't create a second pipeline.

### Task 7: First real integration — login → dashboard smoke test

**Files:**
- Create: `apps/web/e2e/login.spec.ts`
- Create: `apps/web/lib/api/organizations.ts` (thin typed wrapper: `getMyOrganizations()`)

- [ ] Write the Playwright spec first (SRS §34 names Playwright
  specifically) against a running `docker compose` stack + seeded user:
  log in, assert redirect to `/`, assert the organization name renders in
  `<OrgSwitcher>`.
- [ ] Confirm it fails for the right reason (no login page yet / 404),
  then build Tasks 2–5 to make it pass — this phase's own exit condition
  *is* this test passing, so treat it as the acceptance test for
  everything above, not an afterthought.

---

## Definition of Done for this phase

- [ ] `pnpm --filter web dev` boots against a running `apps/api` +
  `docker compose` stack with zero hardcoded URLs (everything from
  `lib/env.ts`).
- [ ] Login → dashboard round-trip works with real cookies (verify in
  browser devtools: `access_token`/`refresh_token` show `HttpOnly`,
  `active_org_id` does not).
- [ ] Killing the access token's validity (wait past `JWT_ACCESS_TTL_SECONDS`,
  or truncate it in devtools) and clicking any button still works —
  proves refresh-on-401 in the proxy.
- [ ] `pnpm --filter web test` and `pnpm --filter web test:e2e` (against
  the docker stack) both pass; `pnpm --filter web build`/`lint`/`typecheck`
  clean.
- [ ] `e2e/login.spec.ts` passes.

## Explicitly deferred

- A shared `packages/types` or `packages/api-contracts` package so the
  frontend's DTO/permission mirrors can't drift from the backend's real
  types — genuinely valuable, but the backend has 7 phases and ~40
  DTOs already; extracting them retroactively is its own project. For
  now, each frontend phase's plan lists the exact backend DTO shape it
  mirrors (as this phase did for `LoginDto`/`RegisterDto`), and drift is
  caught by the Playwright E2E suite hitting the real API, not by types.
- Sentry (SRS §32: "Sentry for frontend/backend exception monitoring") —
  not wired on the backend either yet; revisit for both together rather
  than adding it one-sided.
- Edge-middleware token refresh, WebSocket/SSE push for notifications —
  the refresh-on-401 proxy and polling (later phases) cover the same
  requirements without the added infrastructure.
- Storybook / visual regression — no design-system drift risk yet with
  only 8 shadcn primitives in use.
