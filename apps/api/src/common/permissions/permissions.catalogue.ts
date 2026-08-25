export const PERMISSIONS = {
  ORGANIZATION_UPDATE: 'organization.update',
  ORGANIZATION_MANAGE_MEMBERS: 'organization.manage_members',
  ORGANIZATION_MANAGE_ROLES: 'organization.manage_roles',
  CONFERENCE_CREATE: 'conference.create',
  CONFERENCE_READ: 'conference.read',
  CONFERENCE_UPDATE: 'conference.update',
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
    ],
  },
  {
    name: 'Conference Admin',
    description:
      'Setup and management for conferences the member is assigned to.',
    permissions: [PERMISSIONS.CONFERENCE_READ, PERMISSIONS.CONFERENCE_UPDATE],
  },
];
