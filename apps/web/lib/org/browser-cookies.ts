/** active_org_id is intentionally not httpOnly, so it's the one cookie this app reads/writes from client JS. */
export function readCookieValue(cookieString: string, name: string): string | null {
  const match = cookieString.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function buildCookieString(name: string, value: string, options: { secure: boolean }): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'path=/', 'samesite=lax'];
  if (options.secure) {
    parts.push('secure');
  }
  return parts.join('; ');
}
