'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';

/** Shape returned by GET /auth/me (mirrors AuthService.getProfile). */
export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** True only for the platform Super Admin account(s). Org-level roles are
   *  tracked separately via OrganizationMembership. */
  isSuperAdmin: boolean;
}

export const CURRENT_USER_QUERY_KEY = ['currentUser'];

/**
 * Fetches the authenticated user's profile from the backend.
 *
 * The `isSuperAdmin` field is used to conditionally show platform-admin UI
 * (e.g. the "Create an organization" flow, which only Super Admins may access).
 * Cached for 5 minutes — re-fetched on window focus by TanStack Query's default.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => apiGet<CurrentUser>('auth/me'),
    staleTime: 5 * 60 * 1000,
  });
}
