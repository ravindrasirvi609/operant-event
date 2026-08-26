/**
 * Literal mirror of apps/api/src/common/permissions/permissions.catalogue.ts.
 * Kept in sync by hand — see docs/plans/frontend/00-foundation.md's
 * "Explicitly deferred" note on why this isn't a shared package yet.
 */
export const PERMISSIONS = {
  ORGANIZATION_UPDATE: 'organization.update',
  ORGANIZATION_MANAGE_MEMBERS: 'organization.manage_members',
  ORGANIZATION_MANAGE_ROLES: 'organization.manage_roles',
  CONFERENCE_CREATE: 'conference.create',
  CONFERENCE_READ: 'conference.read',
  CONFERENCE_UPDATE: 'conference.update',
  ABSTRACT_READ: 'abstract.read',
  ABSTRACT_OVERRIDE_DEADLINE: 'abstract.override_deadline',
  REVIEWER_MANAGE: 'reviewer.manage',
  REVIEW_ASSIGNMENT_MANAGE: 'review_assignment.manage',
  DECISION_RECORD: 'decision.record',
  REGISTRATION_MANAGE: 'registration.manage',
  PAYMENT_MANAGE: 'payment.manage',
  PAYMENT_REFUND: 'payment.refund',
  PROGRAM_MANAGE: 'program.manage',
  CHECKIN_MANAGE: 'checkin.manage',
  CERTIFICATE_MANAGE: 'certificate.manage',
  SPONSOR_MANAGE: 'sponsor.manage',
  EXHIBITOR_MANAGE: 'exhibitor.manage',
  EMAIL_TEMPLATE_MANAGE: 'email_template.manage',
  REPORT_VIEW: 'report.view',
  EXPORT_MANAGE: 'export.manage',
  IMPORT_MANAGE: 'import.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function hasPermission(effectivePermissions: readonly string[], key: PermissionKey): boolean {
  return effectivePermissions.includes(key);
}
