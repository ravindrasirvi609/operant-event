export interface Organization {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  logoFileId: string | null;
}

export const MEMBERSHIP_STATUSES = ['ACTIVE', 'DEACTIVATED'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export interface Role {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface AuthSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}
