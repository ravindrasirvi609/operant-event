export const ORGANIZATION_STATUSES = ['ACTIVE', 'SUSPENDED', 'ARCHIVED'] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  logoFileId: string | null;
}

/** Shape returned only by GET /organizations (Super Admin's all-organizations list). */
export interface OrganizationWithMemberCount extends Organization {
  _count: { memberships: number };
}

export const MEMBERSHIP_STATUSES = ['INVITED', 'ACTIVE', 'DEACTIVATED'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export interface Role {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  status: MembershipStatus;
  invitedAt: string;
  joinedAt: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: string;
  };
  roles: { role: Role }[];
}

export interface AuthSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}
