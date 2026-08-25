# Phase 1 — Auth, Organization, RBAC, Conference

**Spec:** SRS §7 (Tenant and Organization Model), §8 (Roles and
Permissions), §9.1–9.3 (Auth/Org/Conference requirements), §27
(Data Model), §28 (Security).

**Depends on:** Phase 0 (monorepo boots, migration pipeline works).

**Goal:** a user can register, log in, create an organization, invite
members with roles, and create/configure/publish a conference — with every
query proven tenant-isolated.

**Exit condition (SRS §39):** *Tenant-safe conference creation and
management works.*

**Requirement IDs covered:** `AUTH-001`…`AUTH-006`, `ORG-001`…`ORG-006`,
`CONF-001`…`CONF-006`.

---

## Key design decision: users are global, not organization-bound

SRS §27.2 lists `users`' required core fields as `id, email, name,
password/session fields, status, timestamps` — no `organization_id`. This
matters: several personas (`Author`, `Attendee`, `Reviewer`,
`Speaker/Chair` — SRS §4) interact with conferences run by organizations
they are not staff members of, and the same person may be an author under
one organization and an attendee under another. Making `organizationId`
a required column on `User` would break that.

So: `User` is a single global identity. Organization *staff* membership
(with a role) is a separate join table, `OrganizationMembership`. Being an
author/reviewer/attendee on a conference never requires an
`OrganizationMembership` row — those relationships are recorded directly
on `Author`, `ReviewAssignment`, `Registration` etc. in later phases,
scoped by `conferenceId`.

## Data model

```prisma
enum OrganizationStatus { ACTIVE SUSPENDED ARCHIVED }
enum UserStatus { INVITED ACTIVE SUSPENDED DEACTIVATED }
enum MembershipStatus { INVITED ACTIVE DEACTIVATED }
enum ConferenceStatus { DRAFT OPEN REVIEW REGISTRATION ONGOING COMPLETED ARCHIVED }
enum ReviewMode { SINGLE_BLIND DOUBLE_BLIND OPEN }

model Organization {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  status        OrganizationStatus @default(ACTIVE)
  contactEmail  String?
  contactPhone  String?
  website       String?
  logoFileId    String?
  memberships   OrganizationMembership[]
  roles         Role[]
  conferences   Conference[]
  auditLogs     AuditLog[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  passwordHash      String
  firstName         String
  lastName          String
  status            UserStatus @default(INVITED)
  emailVerifiedAt   DateTime?
  lastLoginAt       DateTime?
  memberships       OrganizationMembership[]
  sessions          Session[]
  passwordResets    PasswordResetToken[]
  emailVerifications EmailVerificationToken[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model OrganizationMembership {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  status         MembershipStatus @default(INVITED)
  invitedAt      DateTime @default(now())
  joinedAt       DateTime?
  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User @relation(fields: [userId], references: [id])
  roles          MembershipRole[]
  @@unique([organizationId, userId])
  @@index([userId])
}

model Role {
  id             String   @id @default(cuid())
  organizationId String?  // null = platform-level system role (e.g. SUPER_ADMIN)
  name           String
  description    String?
  isSystem       Boolean  @default(false)
  organization   Organization? @relation(fields: [organizationId], references: [id])
  permissions    RolePermission[]
  memberships    MembershipRole[]
  @@unique([organizationId, name])
}

model Permission {
  id     String @id @default(cuid())
  module String // e.g. "conference", "abstract", "payment"
  action String // e.g. "create", "read", "review", "refund"
  roles  RolePermission[]
  @@unique([module, action])
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])
  @@id([roleId, permissionId])
}

model MembershipRole {
  membershipId String
  roleId       String
  membership   OrganizationMembership @relation(fields: [membershipId], references: [id])
  role         Role @relation(fields: [roleId], references: [id])
  @@id([membershipId, roleId])
}

model Session {
  id               String   @id @default(cuid())
  userId           String
  refreshTokenHash String
  userAgent        String?
  ipAddress        String?
  expiresAt        DateTime
  revokedAt        DateTime?
  user             User @relation(fields: [userId], references: [id])
  createdAt        DateTime @default(now())
  @@index([userId])
}

model PasswordResetToken {
  id        String @id @default(cuid())
  userId    String
  tokenHash String @unique
  expiresAt DateTime
  usedAt    DateTime?
  user      User @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}

model EmailVerificationToken {
  id        String @id @default(cuid())
  userId    String
  tokenHash String @unique
  expiresAt DateTime
  usedAt    DateTime?
  user      User @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}

model Conference {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  slug           String
  shortName      String?
  description    String?
  startDate      DateTime
  endDate        DateTime
  timezone       String
  venueName      String?
  venueAddress   String?
  city           String?
  country        String?
  website        String?
  contactEmail   String?
  logoFileId     String?
  bannerFileId   String?
  status         ConferenceStatus @default(DRAFT)
  createdBy      String
  organization   Organization @relation(fields: [organizationId], references: [id])
  settings       ConferenceSetting?
  tracks         ConferenceTrack[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([organizationId, slug])
  @@index([organizationId, status])
}

model ConferenceSetting {
  id                      String   @id @default(cuid())
  conferenceId            String   @unique
  abstractEnabled         Boolean  @default(false)
  abstractStartDate       DateTime?
  abstractEndDate         DateTime?
  reviewEnabled           Boolean  @default(false)
  reviewMode              ReviewMode @default(SINGLE_BLIND)
  registrationEnabled     Boolean  @default(false)
  registrationStartDate   DateTime?
  registrationEndDate     DateTime?
  paymentEnabled          Boolean  @default(false)
  certificateEnabled      Boolean  @default(false)
  checkinEnabled          Boolean  @default(false)
  conference              Conference @relation(fields: [conferenceId], references: [id])
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}

model ConferenceTrack {
  id           String @id @default(cuid())
  conferenceId String
  name         String
  code         String?
  description  String?
  sortOrder    Int    @default(0)
  status       String @default("ACTIVE")
  conference   Conference @relation(fields: [conferenceId], references: [id])
  @@index([conferenceId])
}

model File {
  id             String   @id @default(cuid())
  organizationId String
  fileName       String
  storageKey     String
  mimeType       String
  size           Int
  bucket         String
  uploadedBy     String
  createdAt      DateTime @default(now())
  @@index([organizationId])
}

model AuditLog {
  id             String   @id @default(cuid())
  organizationId String?
  conferenceId   String?
  actorUserId    String?
  action         String
  entityType     String
  entityId       String
  oldValues      Json?
  newValues      Json?
  ipAddress      String?
  userAgent      String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
  @@index([organizationId, createdAt])
  @@index([conferenceId, createdAt])
}
```

**Seed data** (`apps/api/prisma/seed.ts`): the `Permission` catalogue
(module/action pairs — at minimum one per module in Appendix A) and the
system `Role`s (`SUPER_ADMIN` with `organizationId: null`, plus the
org-level defaults `Organization Owner`, `Organization Admin`,
`Conference Admin`, `Track Chair`, `Reviewer`, `Finance Manager`,
`Registration Staff` from SRS §8, each `isSystem: true` so they can't be
deleted but *can* be cloned into custom roles).

## Module & file structure (`apps/api/src/`)

```
common/
  guards/jwt-auth.guard.ts
  guards/permissions.guard.ts
  guards/organization-scope.guard.ts
  decorators/current-user.decorator.ts
  decorators/current-organization.decorator.ts
  decorators/require-permissions.decorator.ts
  filters/http-exception.filter.ts
  interceptors/audit-log.interceptor.ts
  services/audit-log.service.ts
  prisma/prisma.service.ts
  prisma/prisma.module.ts
auth/
  auth.module.ts  auth.controller.ts  auth.service.ts
  strategies/jwt.strategy.ts
  dto/register.dto.ts  dto/login.dto.ts  dto/refresh.dto.ts
  dto/request-password-reset.dto.ts  dto/confirm-password-reset.dto.ts
users/
  users.module.ts  users.controller.ts  users.service.ts
organizations/
  organizations.module.ts  organizations.controller.ts  organizations.service.ts
  dto/create-organization.dto.ts  dto/invite-member.dto.ts
roles/
  roles.module.ts  roles.controller.ts  roles.service.ts
permissions/
  permissions.module.ts  permissions.service.ts  permissions.catalogue.ts
conferences/
  conferences.module.ts  conferences.controller.ts  conferences.service.ts
  dto/create-conference.dto.ts  dto/update-conference.dto.ts
conference-settings/
  conference-settings.module.ts  conference-settings.controller.ts  conference-settings.service.ts
tracks/
  tracks.module.ts  tracks.controller.ts  tracks.service.ts
files/
  files.module.ts  files.controller.ts  files.service.ts
```

`PermissionsGuard` reads `@RequirePermissions('conference.create')` off
the route handler, resolves the caller's effective permission set from
`OrganizationMembership → MembershipRole → Role → RolePermission`, and
denies with `403` if absent. `OrganizationScopeGuard` resolves
`organizationId` from the caller's membership (never from the request
body/params) and attaches it to the request for services to use — this is
the mechanism that satisfies SRS §7.1's "never from client-supplied tenant
ID" rule for every module built after this one.

## API surface

| Method & path | Purpose | Auth |
|---|---|---|
| `POST /api/v1/auth/register` | AUTH-001 create account | public |
| `POST /api/v1/auth/login` | AUTH-002 | public |
| `POST /api/v1/auth/refresh` | rotate session | refresh token |
| `POST /api/v1/auth/logout` | revoke current session | session |
| `POST /api/v1/auth/verify-email` | AUTH-004 | token |
| `POST /api/v1/auth/password-reset/request` | AUTH-003 | public |
| `POST /api/v1/auth/password-reset/confirm` | AUTH-003 | token |
| `GET /api/v1/auth/sessions` | list own sessions | session |
| `DELETE /api/v1/auth/sessions/:id` | AUTH-005 revoke a session | session |
| `GET /api/v1/organizations/me` | orgs the caller belongs to | session |
| `POST /api/v1/organizations` | ORG-001 | session |
| `PATCH /api/v1/organizations/:id` | ORG-002 | `organization.update` |
| `POST /api/v1/organizations/:id/members` | ORG-003 invite | `organization.manage_members` |
| `PATCH /api/v1/organizations/:id/members/:membershipId` | deactivate/reassign roles | `organization.manage_members` |
| `GET /api/v1/organizations/:id/roles` | list roles | `organization.manage_roles` |
| `POST /api/v1/organizations/:id/roles` | ORG-004 create custom role | `organization.manage_roles` |
| `GET /api/v1/conferences` | list within caller's org | session |
| `POST /api/v1/conferences` | CONF-001 | `conference.create` |
| `GET /api/v1/conferences/:id` | detail | `conference.read` |
| `PATCH /api/v1/conferences/:id` | update identity/dates | `conference.update` |
| `PUT /api/v1/conferences/:id/settings` | CONF-002 | `conference.update` |
| `GET /api/v1/conferences/:id/tracks` | list tracks | `conference.read` |
| `POST /api/v1/conferences/:id/tracks` | CONF-003 | `conference.update` |
| `PATCH /api/v1/conferences/:id/tracks/:trackId` | update/reorder/archive | `conference.update` |
| `POST /api/v1/conferences/:id/publish` | CONF-005 | `conference.update` |
| `POST /api/v1/files/presign` | request a presigned upload URL | session |

All list endpoints are paginated (`?page=&pageSize=`, capped page size)
per SRS §25/§26.1. Every response uses the standard envelope from
`common/filters/http-exception.filter.ts` (`{ data, meta }` on success;
`{ error: { code, message, correlationId } }` on failure) — this envelope
is defined here and reused unchanged by every later phase.

## Business rules

- **AUTH-002**: login failure returns a single generic message regardless
  of whether the email or password was wrong.
- **AUTH-003/004**: reset and verification tokens are single-use,
  short-lived (store only the hash, never the raw token), and consuming
  one immediately invalidates it.
- **CONF-001**: new conferences are always created `DRAFT`.
- **CONF-005**: `publish` (`DRAFT → OPEN`) is rejected with a field-level
  validation list (not a generic 400) if `ConferenceSetting` is missing
  required fields for any *enabled* module (e.g. `abstractEnabled: true`
  requires both abstract dates set).
- **CONF-006**: status transitions are a fixed table
  (`DRAFT→OPEN→REVIEW→REGISTRATION→ONGOING→COMPLETED→ARCHIVED`, plus
  `DRAFT→ARCHIVED` for abandoned drafts); anything else is `409`.
- **ORG-005 / tenant isolation**: every `conferences`/`tracks`/`settings`
  query filters by `organizationId` resolved from the session — this
  phase is where the negative-authorization test suite starts (SRS §34,
  "Security" row) and stays a release blocker for every later phase.

## Testing focus (SRS §34)

- Unit: password hashing, JWT issuance/verification, role→permission
  resolution, status-transition validation.
- Integration (real test DB): registering two organizations and asserting
  org A's token can never read/write org B's conferences/tracks/roles.
- API: auth flows (register→verify→login→refresh→logout), full
  conference create→configure→publish happy path, and the negative case
  (publish blocked with actionable errors when required settings are
  missing).

## Definition of Done

- [ ] All `AUTH-*`, `ORG-*`, `CONF-*` requirements above pass their stated
  acceptance criteria.
- [ ] Negative-authorization tests exist and pass for every endpoint in
  this phase (cross-tenant read/write attempts return `403`/`404`, not
  data).
- [ ] Permission catalogue + system roles are seeded and documented.
- [ ] OpenAPI/Swagger reflects every endpoint above.
- [ ] `Organization`, `User`, `Conference` audit events are recorded via
  `AuditLogInterceptor` for create/update/publish actions.
