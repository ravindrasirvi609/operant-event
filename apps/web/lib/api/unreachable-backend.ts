/**
 * A `fetch` to the backend can reject outright (network error, backend
 * down, DNS failure) rather than resolving to a non-2xx Response — that's
 * not an ApiError, it's a transport failure. Route Handlers catch it and
 * call this to return a clean JSON error instead of leaking a raw
 * exception to the client.
 */
export function unreachableBackendBody(): { message: string } {
  return { message: 'The server is temporarily unavailable. Please try again shortly.' };
}

export const UNREACHABLE_BACKEND_STATUS = 502;
