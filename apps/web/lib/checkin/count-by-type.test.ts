
import { describe, expect, it } from 'vitest';
import { countByType } from './count-by-type';
import type { CheckinWithRegistration } from './types';

function checkin(
  registrationId: string,
  checkinType: CheckinWithRegistration['checkinType'],
): CheckinWithRegistration {
  return {
    id: `checkin-${registrationId}-${checkinType}`,
    conferenceId: 'conf-1',
    registrationId,
    checkinType,
    checkedInAt: '2027-01-01T00:00:00Z',
    deviceId: null,
    registration: {
      id: registrationId,
      registrationNumber: `REG-${registrationId}`,
      userId: `user-${registrationId}`,
      status: 'CHECKED_IN',
    },
  };
}

describe('countByType', () => {
  it('counts unique delegates per check-in type', () => {
    const result = countByType([
      checkin('reg-1', 'MAIN_EVENT'),
      checkin('reg-1', 'MAIN_EVENT'),
      checkin('reg-2', 'MAIN_EVENT'),
      checkin('reg-1', 'WORKSHOP'),
    ]);

    expect(result).toEqual({
      MAIN_EVENT: 2,
      WORKSHOP: 1,
      SESSION: 0,
      BANQUET: 0,
    });
  });

  it('returns all-zero counts for an empty list', () => {
    expect(countByType([])).toEqual({
      MAIN_EVENT: 0,
      WORKSHOP: 0,
      SESSION: 0,
      BANQUET: 0,
    });
  });

  it('counts the same delegate separately for different check-in types', () => {
    const result = countByType([
      checkin('reg-1', 'MAIN_EVENT'),
      checkin('reg-1', 'WORKSHOP'),
      checkin('reg-1', 'BANQUET'),
    ]);

    expect(result).toEqual({
      MAIN_EVENT: 1,
      WORKSHOP: 1,
      SESSION: 0,
      BANQUET: 1,
    });
  });
});
