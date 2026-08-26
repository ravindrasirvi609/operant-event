import { RegistrationQuery } from './registration.query';
import type { PrismaService } from '../../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    registration: { groupBy: jest.fn().mockResolvedValue([]) },
    registrationType: { findMany: jest.fn().mockResolvedValue([]) },
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

describe('RegistrationQuery.run', () => {
  it('groups registration counts by status and by registration type name', async () => {
    const groupBy = jest
      .fn()
      .mockResolvedValueOnce([
        { status: 'CONFIRMED', _count: { _all: 50 } },
        { status: 'PENDING', _count: { _all: 5 } },
      ])
      .mockResolvedValueOnce([
        { registrationTypeId: 'type-1', _count: { _all: 40 } },
        { registrationTypeId: 'type-2', _count: { _all: 15 } },
      ]);
    const findMany = jest.fn().mockResolvedValue([
      { id: 'type-1', name: 'Early Bird' },
      { id: 'type-2', name: 'Regular' },
    ]);
    const prisma = fakePrisma({
      registration: { groupBy },
      registrationType: { findMany },
    });
    const query = new RegistrationQuery(prisma);

    const result = await query.run('conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: ['type-1', 'type-2'] } },
    });
    expect(result).toEqual({
      byStatus: { CONFIRMED: 50, PENDING: 5 },
      byType: { 'Early Bird': 40, Regular: 15 },
    });
  });

  it('returns empty breakdowns and skips the type lookup when there are no registrations', async () => {
    const findMany = jest.fn();
    const prisma = fakePrisma({ registrationType: { findMany } });
    const query = new RegistrationQuery(prisma);

    const result = await query.run('conf-1');

    expect(findMany).not.toHaveBeenCalled();
    expect(result).toEqual({ byStatus: {}, byType: {} });
  });
});
