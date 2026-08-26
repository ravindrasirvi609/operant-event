/** §22 dashboard table — one key per row. */
export const DASHBOARDS = {
  CONFERENCE_OVERVIEW: 'conference-overview',
  ABSTRACTS: 'abstracts',
  REVIEW: 'review',
  REGISTRATION: 'registration',
  REVENUE: 'revenue',
  ATTENDANCE: 'attendance',
  CERTIFICATES: 'certificates',
} as const;

export type DashboardKey = (typeof DASHBOARDS)[keyof typeof DASHBOARDS];
