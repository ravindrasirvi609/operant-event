const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
];

/**
 * Returns the IANA timezone list supported by the current runtime.
 *
 * Some runtimes expose only canonical timezone identifiers through
 * Intl.supportedValuesOf('timeZone') and may omit valid IANA aliases
 * such as Asia/Kolkata. The curated list is therefore merged in so
 * important supported timezones are always available.
 */
export function listTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    const supportedTimezones = Intl.supportedValuesOf('timeZone');

    return Array.from(
      new Set([...supportedTimezones, ...FALLBACK_TIMEZONES]),
    ).sort();
  }

  return FALLBACK_TIMEZONES;
}