/** Verbatim from apps/api/src/reports/dashboard.constants.ts — kebab-case, do not guess casing. */
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

/** No dashboard supports date-range filtering — every shape below is a lifetime aggregate snapshot. */
export interface ConferenceOverviewQuery {
  totalAbstracts: number;
  totalRegistrations: number;
  totalRevenue: number;
  totalCheckins: number;
  totalCertificatesIssued: number;
}

/** Keys present only when their count > 0 — never assume every AbstractStatus key exists. */
export interface AbstractsQuery {
  byStatus: Record<string, number>;
}

export interface ReviewQuery {
  byStatus: Record<string, number>;
  averageOverallScore: number;
  overdueCount: number;
}

export interface RegistrationQuery {
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

/** `byProvider` keys are raw stored strings ("razorpay"/"stripe"/"MANUAL") — not normalized casing. */
export interface RevenueQuery {
  totalCollected: number;
  byProvider: Record<string, number>;
  totalRefunded: number;
}

/** `uniqueAttendees` is derived from Checkin rows, not the Attendance model, despite the dashboard's name. */
export interface AttendanceQuery {
  byType: Record<string, number>;
  uniqueAttendees: number;
}

/** Outer key = certificateType, inner key = CertificateStatus. */
export interface CertificatesQuery {
  byTypeAndStatus: Record<string, Record<string, number>>;
}
