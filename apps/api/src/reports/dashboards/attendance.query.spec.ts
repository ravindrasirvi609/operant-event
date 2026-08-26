import { AttendanceQuery } from './attendance.query';
import type { PrismaService } from '../../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    checkin: {
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const baseRecord = base as unknown as Record<
    string,
    Record<string, jest.Mock>
  >;
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(baseRecord[model], methods);
  }
  return base as unknown as PrismaService;
}

describe('AttendanceQuery.run', () => {
  it('groups check-ins by type and counts unique attendees', async () => {
    const groupBy = jest.fn().mockResolvedValue([
      { checkinType: 'MAIN_EVENT', _count: { _all: 90 } },
      { checkinType: 'WORKSHOP', _count: { _all: 30 } },
    ]);
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { registrationId: 'reg-1' },
        { registrationId: 'reg-2' },
        { registrationId: 'reg-3' },
      ]);
    const prisma = fakePrisma({ checkin: { groupBy, findMany } });
    const query = new AttendanceQuery(prisma);

    const result = await query.run('conf-1');

    expect(groupBy).toHaveBeenCalledWith({
      by: ['checkinType'],
      where: { conferenceId: 'conf-1' },
      _count: { _all: true },
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      distinct: ['registrationId'],
      select: { registrationId: true },
    });
    expect(result).toEqual({
      byType: { MAIN_EVENT: 90, WORKSHOP: 30 },
      uniqueAttendees: 3,
    });
  });

  it('returns zero unique attendees when there are no check-ins', async () => {
    const query = new AttendanceQuery(fakePrisma());

    await expect(query.run('conf-1')).resolves.toEqual({
      byType: {},
      uniqueAttendees: 0,
    });
  });
});
