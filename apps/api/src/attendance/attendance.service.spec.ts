import { NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn() },
    attendance: {
      count: jest.fn().mockResolvedValue(0),
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

describe('AttendanceService.countForRegistration', () => {
  it('counts attendance rows for the registration', async () => {
    const count = jest.fn().mockResolvedValue(3);
    const prisma = fakePrisma({ attendance: { count, findMany: jest.fn() } });
    const service = new AttendanceService(prisma);

    const result = await service.countForRegistration('reg-1');

    expect(count).toHaveBeenCalledWith({ where: { registrationId: 'reg-1' } });
    expect(result).toBe(3);
  });
});

describe('AttendanceService.findAllForConference', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new AttendanceService(prisma);

    await expect(
      service.findAllForConference('org-1', 'conf-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists attendance for the conference', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      attendance: { count: jest.fn(), findMany },
    });
    const service = new AttendanceService(prisma);

    await service.findAllForConference('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      orderBy: { checkedInAt: 'desc' },
      include: { registration: true, session: true },
    });
  });
});
