export interface AuthenticatedSummary {
  id: string;
  email: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedSummary;
}

/**
 * The org switcher only needs id/name, but `organizations/me` really
 * returns the full Organization row (apps/api applies no `select`) — this
 * is a deliberate subset view of `lib/organizations/types.ts#Organization`,
 * kept here so the login route doesn't need to import across that
 * boundary for a field it doesn't otherwise use.
 */
export interface OrganizationSummary {
  id: string;
  name: string;
}
