export interface AuthenticatedSummary {
  id: string;
  email: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedSummary;
}

export interface OrganizationSummary {
  id: string;
  name: string;
}
