import { create } from 'zustand';
import { ACTIVE_ORG_COOKIE } from '../auth/cookies';
import { buildCookieString, readCookieValue } from './browser-cookies';

interface ActiveOrgState {
  activeOrgId: string | null;
  /** Client-only — reads document.cookie. Called once on mount by useActiveOrganization(). */
  hydrateFromCookie: () => void;
  setActiveOrgId: (organizationId: string) => void;
}

export const useActiveOrgStore = create<ActiveOrgState>((set) => ({
  activeOrgId: null,
  hydrateFromCookie: () => {
    if (typeof document === 'undefined') {
      return;
    }
    const value = readCookieValue(document.cookie, ACTIVE_ORG_COOKIE);
    if (value) {
      set({ activeOrgId: value });
    }
  },
  setActiveOrgId: (organizationId: string) => {
    if (typeof document !== 'undefined') {
      document.cookie = buildCookieString(ACTIVE_ORG_COOKIE, organizationId, {
        secure: window.location.protocol === 'https:',
      });
    }
    set({ activeOrgId: organizationId });
  },
}));
