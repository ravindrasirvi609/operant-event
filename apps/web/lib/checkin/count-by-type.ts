
import {
  CHECKIN_TYPES,
  type CheckinType,
  type CheckinWithRegistration,
} from './types';

/**
 * Count unique delegates for each check-in type.
 * Repeated historical scans won't inflate the dashboard totals.
 */
export function countByType(
  checkins: CheckinWithRegistration[],
): Record<CheckinType, number> {
  const registrationsByType = new Map<CheckinType, Set<string>>();

  for (const type of CHECKIN_TYPES) {
    registrationsByType.set(type, new Set<string>());
  }

  for (const checkin of checkins) {
    registrationsByType
      .get(checkin.checkinType)
      ?.add(checkin.registrationId);
  }

  return Object.fromEntries(
    CHECKIN_TYPES.map((type) => [
      type,
      registrationsByType.get(type)?.size ?? 0,
    ]),
  ) as Record<CheckinType, number>;
}
