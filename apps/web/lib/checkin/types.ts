export const CHECKIN_TYPES = ['MAIN_EVENT', 'WORKSHOP', 'SESSION', 'BANQUET'] as const;
export type CheckinType = (typeof CHECKIN_TYPES)[number];

export interface Checkin {
  id: string;
  conferenceId: string;
  registrationId: string;
  checkinType: CheckinType;
  checkedInAt: string;
  deviceId: string | null;
}

/**
 * `GET conferences/:conferenceId/checkins` embeds the full registration
 * row (not just id) — but a `Checkin` itself has no attendee-name field,
 * so any "Checked in: Jane Doe" UI must go through `registration.user`,
 * which the backend does NOT include either (only the bare
 * `Registration` row) — there is no name available anywhere in this
 * response. Attendee identification in the UI must fall back to
 * `registration.registrationNumber`.
 */
export interface CheckinWithRegistration extends Checkin {
  registration: {
    id: string;
    registrationNumber: string;
    userId: string;
    status: string;
  };
}

/** `POST checkins` response — never carries an attendee name (see CheckinWithRegistration note). */
export interface CheckinResult {
  checkin: Checkin;
  reused: boolean;
}

export interface Attendance {
  id: string;
  conferenceId: string;
  registrationId: string;
  sessionId: string | null;
  checkedInAt: string;
}

export interface AttendanceWithDetail extends Attendance {
  registration: {
    id: string;
    registrationNumber: string;
    userId: string;
    status: string;
  };
  session: { id: string; title: string } | null;
}
