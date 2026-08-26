import { NextResponse } from 'next/server';
import { loadEnv } from '@/lib/env';
import { ApiError, parseApiResponse } from '@/lib/api/backend';
import { UNREACHABLE_BACKEND_STATUS, unreachableBackendBody } from '@/lib/api/unreachable-backend';
import { applyTokenCookies } from '@/lib/auth/apply-token-cookies';
import { ACTIVE_ORG_COOKIE, orgCookieOptions } from '@/lib/auth/cookies';
import type { LoginResult, OrganizationSummary } from '@/lib/auth/types';

/**
 * The only Route Handler that ever calls `auth/login` — after this, the
 * browser never sees `accessToken`/`refreshToken` again, only the httpOnly
 * cookies this sets.
 */
export async function POST(request: Request) {
  const env = loadEnv();
  const credentials = await request.json();

  let tokens: LoginResult;
  try {
    const loginResponse = await fetch(`${env.BACKEND_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    tokens = await parseApiResponse<LoginResult>(loginResponse);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(unreachableBackendBody(), { status: UNREACHABLE_BACKEND_STATUS });
  }

  const organizations = await fetch(`${env.BACKEND_API_URL}/organizations/me`, {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  })
    .then((response) => parseApiResponse<OrganizationSummary[]>(response))
    .catch(() => [] as OrganizationSummary[]);

  const response = NextResponse.json({ user: tokens.user, organizations });
  const cookieEnv = { nodeEnv: env.NODE_ENV, domain: env.COOKIE_DOMAIN };
  applyTokenCookies(response, tokens, cookieEnv);

  // Keep an existing active_org_id if it's still one of the user's real
  // memberships (a re-login shouldn't silently switch a returning user's
  // active organization); otherwise default to the first membership.
  const existingActiveOrgId = request.headers
    .get('cookie')
    ?.match(new RegExp(`${ACTIVE_ORG_COOKIE}=([^;]+)`))?.[1];
  const stillValid = organizations.some((org) => org.id === existingActiveOrgId);
  const nextActiveOrgId = stillValid ? existingActiveOrgId : organizations[0]?.id;
  if (nextActiveOrgId) {
    response.cookies.set(ACTIVE_ORG_COOKIE, nextActiveOrgId, orgCookieOptions(cookieEnv));
  }

  return response;
}
