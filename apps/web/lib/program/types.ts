export const SESSION_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SPEAKER_ROLES = ['SPEAKER', 'CHAIR', 'CO_CHAIR', 'KEYNOTE'] as const;
export type SpeakerRole = (typeof SPEAKER_ROLES)[number];

export interface Speaker {
  id: string;
  conferenceId: string;
  userId: string | null;
  name: string;
  designation: string | null;
  institution: string | null;
  bio: string | null;
  photoFileId: string | null;
  country: string | null;
}

export interface SessionSpeaker {
  sessionId: string;
  speakerId: string;
  role: SpeakerRole;
  speaker: Speaker;
}

export interface PresentationAssignment {
  id: string;
  sessionId: string;
  abstractId: string;
  presentationType: string | null;
  startTime: string;
  endTime: string;
  sortOrder: number;
}

/**
 * The organizer-facing `GET .../sessions` list returns bare rows (no
 * `speakers`/`presentations` include) — only the public `GET
 * .../program` route includes them. Both shapes are modeled here;
 * organizer pages fetch speakers/presentations separately per session
 * where needed.
 */
export interface ProgramSession {
  id: string;
  conferenceId: string;
  trackId: string | null;
  title: string;
  description: string | null;
  room: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  sessionType: string | null;
  chairId: string | null;
  coChairId: string | null;
  status: SessionStatus;
}

/** `GET conferences/:conferenceId/program` (public) — full rows, no field stripping. */
export interface PublicProgramSession extends ProgramSession {
  speakers: SessionSpeaker[];
  presentations: PresentationAssignment[];
}
