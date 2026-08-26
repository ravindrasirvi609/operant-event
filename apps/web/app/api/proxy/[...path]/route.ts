import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { loadEnv } from '@/lib/env';
import { proxyRequest } from '@/lib/api/proxy-logic';
import { applyTokenCookies } from '@/lib/auth/apply-token-cookies';
import { ACCESS_TOKEN_COOKIE, ACTIVE_ORG_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { UNREACHABLE_BACKEND_STATUS, unreachableBackendBody } from '@/lib/api/unreachable-backend';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

/**
 * The only thing in this app that ever attaches Authorization/
 * x-organization-id to a backend request on the browser's behalf. Every
 * Client Component call goes through this same-origin route so the
 * httpOnly access/refresh cookies never have to leave the server.
 */
async function handle(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { path } = await params;
  const env = loadEnv();
  const cookieStore = await cookies();

  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : null;
  const targetPath = path.join('/') + request.nextUrl.search;

  let backendResponse: Response;
  let refreshedTokens: Awaited<ReturnType<typeof proxyRequest>>['refreshedTokens'];
  try {
    const result = await proxyRequest(targetPath, request.method, request.headers, body, {
      backendApiUrl: env.BACKEND_API_URL,
      accessToken,
      refreshToken,
      activeOrgId,
      fetchImpl: fetch,
    });
    backendResponse = result.response;
    refreshedTokens = result.refreshedTokens;
  } catch {
    return NextResponse.json(unreachableBackendBody(), { status: UNREACHABLE_BACKEND_STATUS });
  }

  const responseHeaders = new Headers();
  const contentType = backendResponse.headers.get('content-type');
  if (contentType) {
    responseHeaders.set('content-type', contentType);
  }
  const contentDisposition = backendResponse.headers.get('content-disposition');
  if (contentDisposition) {
    responseHeaders.set('content-disposition', contentDisposition);
  }

  const responseBody = await backendResponse.arrayBuffer();
  const response = new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: responseHeaders,
  });

  if (refreshedTokens) {
    applyTokenCookies(response, refreshedTokens, { nodeEnv: env.NODE_ENV, domain: env.COOKIE_DOMAIN });
  }

  return response;
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST, handle as PUT };
