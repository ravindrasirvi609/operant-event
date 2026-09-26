-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "ConferenceStatus" AS ENUM ('DRAFT', 'OPEN', 'REVIEW', 'REGISTRATION', 'ONGOING', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewMode" AS ENUM ('SINGLE_BLIND', 'DOUBLE_BLIND', 'OPEN');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('GATEWAY', 'MANUAL');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'RICH_TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'RADIO', 'CHECKBOX', 'FILE', 'URL');

-- CreateEnum
CREATE TYPE "AbstractStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SCREENING', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'RESUBMITTED', 'ACCEPTED', 'REJECTED', 'WAITLISTED', 'SCHEDULED', 'PRESENTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReviewAssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewRecommendation" AS ENUM ('ACCEPT', 'REJECT', 'MINOR_REVISION', 'MAJOR_REVISION');

-- CreateEnum
CREATE TYPE "AbstractDecisionType" AS ENUM ('ACCEPTED', 'REJECTED', 'REVISION_REQUIRED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'CHECKED_IN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ELIGIBLE', 'GENERATED', 'ISSUED', 'REVOKED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "logoFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "membership_roles" (
    "membershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("membershipId","roleId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conferences" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "venueName" TEXT,
    "venueAddress" TEXT,
    "city" TEXT,
    "country" TEXT,
    "website" TEXT,
    "contactEmail" TEXT,
    "logoFileId" TEXT,
    "bannerFileId" TEXT,
    "status" "ConferenceStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduleVersion" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_settings" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "abstractEnabled" BOOLEAN NOT NULL DEFAULT false,
    "abstractStartDate" TIMESTAMP(3),
    "abstractEndDate" TIMESTAMP(3),
    "reviewEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reviewMode" "ReviewMode" NOT NULL DEFAULT 'SINGLE_BLIND',
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "registrationStartDate" TIMESTAMP(3),
    "registrationEndDate" TIMESTAMP(3),
    "paymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'MANUAL',
    "manualPaymentInstructions" TEXT,
    "certificateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "checkinEnabled" BOOLEAN NOT NULL DEFAULT false,
    "preventSpeakerOverlap" BOOLEAN NOT NULL DEFAULT false,
    "certificateAttendanceThreshold" INTEGER NOT NULL DEFAULT 1,
    "certificateReviewThreshold" INTEGER NOT NULL DEFAULT 1,
    "certificateShowFullName" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conference_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_tracks" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "conference_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "conferenceId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_form_fields" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "FormFieldType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "optionsJson" JSONB,
    "validationJson" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conference_form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abstracts" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "trackId" TEXT,
    "submissionNumber" TEXT,
    "title" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL,
    "presentationPreference" TEXT,
    "status" "AbstractStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abstracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abstract_versions" (
    "id" TEXT NOT NULL,
    "abstractId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "formData" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT NOT NULL,

    CONSTRAINT "abstract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "mobile" TEXT,
    "designation" TEXT,
    "institution" TEXT,
    "department" TEXT,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abstract_authors" (
    "id" TEXT NOT NULL,
    "abstractId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorOrder" INTEGER NOT NULL,
    "isCorresponding" BOOLEAN NOT NULL DEFAULT false,
    "isPresenting" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "abstract_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewer_profiles" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "institution" TEXT,
    "designation" TEXT,
    "bio" TEXT,
    "expertise" TEXT[],
    "keywords" TEXT[],

    CONSTRAINT "reviewer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_assignments" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "abstractId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "ReviewAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "conflictOfInterest" BOOLEAN NOT NULL DEFAULT false,
    "reassignedFromId" TEXT,

    CONSTRAINT "review_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "originalityScore" INTEGER NOT NULL,
    "methodologyScore" INTEGER NOT NULL,
    "significanceScore" INTEGER NOT NULL,
    "presentationScore" INTEGER NOT NULL,
    "commentsToAuthor" TEXT,
    "privateComments" TEXT,
    "recommendation" "ReviewRecommendation" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abstract_decisions" (
    "id" TEXT NOT NULL,
    "abstractId" TEXT NOT NULL,
    "decision" "AbstractDecisionType" NOT NULL,
    "reason" TEXT,
    "decidedBy" TEXT NOT NULL,
    "effectiveVersionId" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abstract_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abstract_revision_requests" (
    "id" TEXT NOT NULL,
    "abstractId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abstract_revision_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_categories" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "registration_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_types" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,

    CONSTRAINT "registration_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationTypeId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "qrCode" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "referenceId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "reference" TEXT,
    "proofFileId" TEXT,
    "decidedBy" TEXT,
    "rejectionReason" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "documentFileId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_sessions" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "trackId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "room" TEXT,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "sessionType" TEXT,
    "chairId" TEXT,
    "coChairId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speakers" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "institution" TEXT,
    "bio" TEXT,
    "photoFileId" TEXT,
    "country" TEXT,

    CONSTRAINT "speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_speakers" (
    "sessionId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "session_speakers_pkey" PRIMARY KEY ("sessionId","speakerId","role")
);

-- CreateTable
CREATE TABLE "presentation_assignments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "abstractId" TEXT NOT NULL,
    "presentationType" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "presentation_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "checkinType" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "sessionId" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "certificateType" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "fileId" TEXT,
    "verificationCode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "status" "CertificateStatus" NOT NULL DEFAULT 'ELIGIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "logoFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibitors" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "boothNumber" TEXT,
    "contactPerson" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibitor_staff" (
    "id" TEXT NOT NULL,
    "exhibitorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,

    CONSTRAINT "exhibitor_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conferenceId" TEXT,
    "event" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conferenceId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "resultFileId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conferenceId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "sourceFileId" TEXT NOT NULL,
    "errorReportFileId" TEXT,
    "rowsProcessed" INTEGER NOT NULL DEFAULT 0,
    "rowsFailed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "organization_memberships_userId_idx" ON "organization_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_userId_key" ON "organization_memberships"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organizationId_name_key" ON "roles"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_module_action_key" ON "permissions"("module", "action");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "conferences_organizationId_status_idx" ON "conferences"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conferences_organizationId_slug_key" ON "conferences"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "conference_settings_conferenceId_key" ON "conference_settings"("conferenceId");

-- CreateIndex
CREATE INDEX "conference_tracks_conferenceId_idx" ON "conference_tracks"("conferenceId");

-- CreateIndex
CREATE INDEX "files_organizationId_idx" ON "files"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_conferenceId_createdAt_idx" ON "audit_logs"("conferenceId", "createdAt");

-- CreateIndex
CREATE INDEX "conference_form_fields_conferenceId_status_idx" ON "conference_form_fields"("conferenceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conference_form_fields_conferenceId_fieldKey_key" ON "conference_form_fields"("conferenceId", "fieldKey");

-- CreateIndex
CREATE INDEX "abstracts_conferenceId_status_idx" ON "abstracts"("conferenceId", "status");

-- CreateIndex
CREATE INDEX "abstracts_conferenceId_trackId_idx" ON "abstracts"("conferenceId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "abstracts_conferenceId_submissionNumber_key" ON "abstracts"("conferenceId", "submissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "abstract_versions_abstractId_versionNumber_key" ON "abstract_versions"("abstractId", "versionNumber");

-- CreateIndex
CREATE INDEX "abstract_authors_abstractId_idx" ON "abstract_authors"("abstractId");

-- CreateIndex
CREATE UNIQUE INDEX "abstract_authors_abstractId_authorId_key" ON "abstract_authors"("abstractId", "authorId");

-- CreateIndex
CREATE UNIQUE INDEX "reviewers_organizationId_userId_key" ON "reviewers"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "reviewer_profiles_reviewerId_key" ON "reviewer_profiles"("reviewerId");

-- CreateIndex
CREATE INDEX "review_assignments_reviewerId_status_idx" ON "review_assignments"("reviewerId", "status");

-- CreateIndex
CREATE INDEX "review_assignments_abstractId_idx" ON "review_assignments"("abstractId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_assignmentId_key" ON "reviews"("assignmentId");

-- CreateIndex
CREATE INDEX "abstract_decisions_abstractId_idx" ON "abstract_decisions"("abstractId");

-- CreateIndex
CREATE INDEX "abstract_revision_requests_abstractId_idx" ON "abstract_revision_requests"("abstractId");

-- CreateIndex
CREATE INDEX "registration_categories_conferenceId_idx" ON "registration_categories"("conferenceId");

-- CreateIndex
CREATE INDEX "registration_types_categoryId_startDate_endDate_idx" ON "registration_types"("categoryId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_registrationNumber_key" ON "registrations"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_qrCode_key" ON "registrations"("qrCode");

-- CreateIndex
CREATE INDEX "registrations_conferenceId_status_idx" ON "registrations"("conferenceId", "status");

-- CreateIndex
CREATE INDEX "registrations_registrationTypeId_idx" ON "registrations"("registrationTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_registrationId_key" ON "orders"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_conferenceId_status_idx" ON "orders"("conferenceId", "status");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerPaymentId_key" ON "payments"("providerPaymentId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_eventId_key" ON "webhook_events"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- CreateIndex
CREATE INDEX "program_sessions_conferenceId_sessionDate_idx" ON "program_sessions"("conferenceId", "sessionDate");

-- CreateIndex
CREATE INDEX "speakers_conferenceId_idx" ON "speakers"("conferenceId");

-- CreateIndex
CREATE INDEX "presentation_assignments_abstractId_idx" ON "presentation_assignments"("abstractId");

-- CreateIndex
CREATE UNIQUE INDEX "presentation_assignments_sessionId_abstractId_key" ON "presentation_assignments"("sessionId", "abstractId");

-- CreateIndex
CREATE INDEX "checkins_registrationId_idx" ON "checkins"("registrationId");

-- CreateIndex
CREATE INDEX "checkins_conferenceId_checkinType_idx" ON "checkins"("conferenceId", "checkinType");

-- CreateIndex
CREATE INDEX "attendances_registrationId_idx" ON "attendances"("registrationId");

-- CreateIndex
CREATE INDEX "attendances_sessionId_idx" ON "attendances"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificateNumber_key" ON "certificates"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verificationCode_key" ON "certificates"("verificationCode");

-- CreateIndex
CREATE INDEX "certificates_conferenceId_status_idx" ON "certificates"("conferenceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_registrationId_certificateType_key" ON "certificates"("registrationId", "certificateType");

-- CreateIndex
CREATE INDEX "sponsors_conferenceId_idx" ON "sponsors"("conferenceId");

-- CreateIndex
CREATE INDEX "exhibitors_conferenceId_idx" ON "exhibitors"("conferenceId");

-- CreateIndex
CREATE INDEX "exhibitor_staff_exhibitorId_idx" ON "exhibitor_staff"("exhibitorId");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_organizationId_conferenceId_event_key" ON "email_templates"("organizationId", "conferenceId", "event");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "export_jobs_organizationId_status_idx" ON "export_jobs"("organizationId", "status");

-- CreateIndex
CREATE INDEX "import_jobs_organizationId_status_idx" ON "import_jobs"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "organization_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conferences" ADD CONSTRAINT "conferences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_settings" ADD CONSTRAINT "conference_settings_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_tracks" ADD CONSTRAINT "conference_tracks_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_form_fields" ADD CONSTRAINT "conference_form_fields_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abstracts" ADD CONSTRAINT "abstracts_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abstracts" ADD CONSTRAINT "abstracts_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "conference_tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abstract_versions" ADD CONSTRAINT "abstract_versions_abstractId_fkey" FOREIGN KEY ("abstractId") REFERENCES "abstracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abstract_authors" ADD CONSTRAINT "abstract_authors_abstractId_fkey" FOREIGN KEY ("abstractId") REFERENCES "abstracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abstract_authors" ADD CONSTRAINT "abstract_authors_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewers" ADD CONSTRAINT "reviewers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_profiles" ADD CONSTRAINT "reviewer_profiles_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "reviewers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_abstractId_fkey" FOREIGN KEY ("abstractId") REFERENCES "abstracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "reviewers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "review_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abstract_decisions" ADD CONSTRAINT "abstract_decisions_abstractId_fkey" FOREIGN KEY ("abstractId") REFERENCES "abstracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abstract_revision_requests" ADD CONSTRAINT "abstract_revision_requests_abstractId_fkey" FOREIGN KEY ("abstractId") REFERENCES "abstracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_categories" ADD CONSTRAINT "registration_categories_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_types" ADD CONSTRAINT "registration_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "registration_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_registrationTypeId_fkey" FOREIGN KEY ("registrationTypeId") REFERENCES "registration_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "conference_tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speakers" ADD CONSTRAINT "speakers_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_speakers" ADD CONSTRAINT "session_speakers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "program_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_speakers" ADD CONSTRAINT "session_speakers_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "speakers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_assignments" ADD CONSTRAINT "presentation_assignments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "program_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_assignments" ADD CONSTRAINT "presentation_assignments_abstractId_fkey" FOREIGN KEY ("abstractId") REFERENCES "abstracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "program_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitors" ADD CONSTRAINT "exhibitors_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitor_staff" ADD CONSTRAINT "exhibitor_staff_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "exhibitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

