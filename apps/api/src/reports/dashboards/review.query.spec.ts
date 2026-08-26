import { ReviewQuery } from './review.query';
import type { PrismaService } from '../../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    reviewAssignment: {
      groupBy: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    review: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { overallScore: null } }),
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

describe('ReviewQuery.run', () => {
  it('groups assignment counts by status, averages the overall score, and counts overdue assignments', async () => {
    const groupBy = jest.fn().mockResolvedValue([
      { status: 'COMPLETED', _count: { _all: 8 } },
      { status: 'PENDING', _count: { _all: 3 } },
    ]);
    const count = jest.fn().mockResolvedValue(2);
    const aggregate = jest
      .fn()
      .mockResolvedValue({ _avg: { overallScore: 7.5 } });
    const prisma = fakePrisma({
      reviewAssignment: { groupBy, count },
      review: { aggregate },
    });
    const query = new ReviewQuery(prisma);

    const result = await query.run('conf-1');

    expect(groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { abstract: { conferenceId: 'conf-1' } },
      _count: { _all: true },
    });
    expect(aggregate).toHaveBeenCalledWith({
      where: { assignment: { abstract: { conferenceId: 'conf-1' } } },
      _avg: { overallScore: true },
    });
    expect(count).toHaveBeenCalledWith({
      where: { abstract: { conferenceId: 'conf-1' }, status: 'OVERDUE' },
    });
    expect(result).toEqual({
      byStatus: { COMPLETED: 8, PENDING: 3 },
      averageOverallScore: 7.5,
      overdueCount: 2,
    });
  });

  it('defaults the average score to 0 when no reviews have been submitted yet', async () => {
    const query = new ReviewQuery(fakePrisma());

    await expect(query.run('conf-1')).resolves.toEqual({
      byStatus: {},
      averageOverallScore: 0,
      overdueCount: 0,
    });
  });
});
