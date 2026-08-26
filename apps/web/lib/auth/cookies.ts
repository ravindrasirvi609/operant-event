export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
/** Not a secret — just a cuid identifying the active organization. */
export const ACTIVE_ORG_COOKIE = 'active_org_id';

interface CookieOptionsInput {
  nodeEnv: string;
  domain?: string;
}

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  domain?: string;
}

function baseCookieOptions({ nodeEnv, domain }: CookieOptionsInput): Omit<CookieOptions, 'httpOnly'> {
  return {
    secure: nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

/** access_token / refresh_token — the browser's JS can never read these. */
export function authCookieOptions(input: CookieOptionsInput): CookieOptions {
  return { httpOnly: true, ...baseCookieOptions(input) };
}

/** active_org_id — set/read client-side by the org switcher, so httpOnly: false. */
export function orgCookieOptions(input: CookieOptionsInput): CookieOptions {
  return { httpOnly: false, ...baseCookieOptions(input) };
}
