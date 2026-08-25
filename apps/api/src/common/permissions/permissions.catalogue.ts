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
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Seed data: every (module, action) pair the platform recognizes so far. Extend as later phases add modules. */
export const PERMISSION_CATALOGUE: Array<{ module: string; action: string }> = [
  { module: 'organization', action: 'update' },
  { module: 'organization', action: 'manage_members' },
  { module: 'organization', action: 'manage_roles' },
  { module: 'conference', action: 'create' },
  { module: 'conference', action: 'read' },
  { module: 'conference', action: 'update' },
  { module: 'abstract', action: 'read' },
  { module: 'abstract', action: 'override_deadline' },
  { module: 'reviewer', action: 'manage' },
  { module: 'review_assignment', action: 'manage' },
  { module: 'decision', action: 'record' },
];

export interface SystemRoleDefinition {
  name: string;
  description: string;
  permissions: PermissionKey[];
}

/** Seed data: built-in roles every organization can assign (isSystem: true, organizationId: null). */
export const SYSTEM_ROLES: SystemRoleDefinition[] = [
  {
    name: 'Organization Owner',
    description:
      'All organization and conference operations; organization billing.',
    permissions: [
      PERMISSIONS.ORGANIZATION_UPDATE,
      PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS,
      PERMISSIONS.ORGANIZATION_MANAGE_ROLES,
      PERMISSIONS.CONFERENCE_CREATE,
      PERMISSIONS.CONFERENCE_READ,
      PERMISSIONS.CONFERENCE_UPDATE,
      PERMISSIONS.ABSTRACT_READ,
      PERMISSIONS.ABSTRACT_OVERRIDE_DEADLINE,
      PERMISSIONS.REVIEWER_MANAGE,
      PERMISSIONS.REVIEW_ASSIGNMENT_MANAGE,
      PERMISSIONS.DECISION_RECORD,
    ],
  },
  {
    name: 'Organization Admin',
    description:
      'Most organization and conference operations excluding ownership transfer.',
    permissions: [
      PERMISSIONS.ORGANIZATION_UPDATE,
      PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS,
      PERMISSIONS.CONFERENCE_CREATE,
      PERMISSIONS.CONFERENCE_READ,
      PERMISSIONS.CONFERENCE_UPDATE,
      PERMISSIONS.ABSTRACT_READ,
      PERMISSIONS.ABSTRACT_OVERRIDE_DEADLINE,
      PERMISSIONS.REVIEWER_MANAGE,
      PERMISSIONS.REVIEW_ASSIGNMENT_MANAGE,
      PERMISSIONS.DECISION_RECORD,
    ],
  },
  {
    name: 'Conference Admin',
    description:
      'Setup and management for conferences the member is assigned to.',
    permissions: [
      PERMISSIONS.CONFERENCE_READ,
      PERMISSIONS.CONFERENCE_UPDATE,
      PERMISSIONS.ABSTRACT_READ,
    ],
  },
  {
    name: 'Track Chair',
    description:
      'Reviewer assignment, review oversight and decisions for assigned tracks (SRS §8).',
    permissions: [
      PERMISSIONS.CONFERENCE_READ,
      PERMISSIONS.ABSTRACT_READ,
      PERMISSIONS.REVIEWER_MANAGE,
      PERMISSIONS.REVIEW_ASSIGNMENT_MANAGE,
      PERMISSIONS.DECISION_RECORD,
    ],
  },
];
