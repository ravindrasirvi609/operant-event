'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';

/** Shape returned by GET /auth/me (mirrors AuthService.getProfile). */
export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;

  /**
   * True only for the platform Super Admin account(s).
   * Org-level roles are tracked separately via OrganizationMembership.
   */
  isSuperAdmin: boolean;

  /**
   * True when the authenticated user has an active Reviewer record.
   */
  isReviewer: boolean;
}

export const CURRENT_USER_QUERY_KEY = ['currentUser'];

/**
 * Fetches the authenticated user's profile from the backend.
 *
 * The `isSuperAdmin` field is used to conditionally show platform-admin UI.
 * The `isReviewer` field is used to route reviewers to the Reviewer Portal.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => apiGet<CurrentUser>('auth/me'),
    staleTime: 5 * 60 * 1000,
  });
}