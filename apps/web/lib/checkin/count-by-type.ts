import { CHECKIN_TYPES, type CheckinType, type CheckinWithRegistration } from './types';

/** The backend returns only a flat list, no aggregate counts — this derives per-type totals client-side. */
export function countByType(checkins: CheckinWithRegistration[]): Record<CheckinType, number> {
  const counts = Object.fromEntries(CHECKIN_TYPES.map((type) => [type, 0])) as Record<CheckinType, number>;
  for (const checkin of checkins) {
    counts[checkin.checkinType] += 1;
  }
  return counts;
}
