import { describe, expect, it } from 'vitest';
import { countByType } from './count-by-type';
import type { CheckinWithRegistration } from './types';

function checkin(checkinType: CheckinWithRegistration['checkinType']): CheckinWithRegistration {
  return {
    id: 'checkin-1',
    conferenceId: 'conf-1',
    registrationId: 'reg-1',
    checkinType,
    checkedInAt: '2027-01-01T00:00:00Z',
    deviceId: null,
    registration: { id: 'reg-1', registrationNumber: 'REG-1', userId: 'user-1', status: 'CHECKED_IN' },
  };
}

describe('countByType', () => {
  it('counts check-ins per checkinType, since the backend returns no aggregate counts', () => {
    const result = countByType([checkin('MAIN_EVENT'), checkin('MAIN_EVENT'), checkin('WORKSHOP')]);

    expect(result).toEqual({ MAIN_EVENT: 2, WORKSHOP: 1, SESSION: 0, BANQUET: 0 });
  });

  it('returns all-zero counts for an empty list', () => {
    expect(countByType([])).toEqual({ MAIN_EVENT: 0, WORKSHOP: 0, SESSION: 0, BANQUET: 0 });
  });
});
