import { AbstractsQuery } from './abstracts.query';
import type { PrismaService } from '../../common/prisma/prisma.service';

function fakePrisma(
  groupBy: jest.Mock = jest.fn().mockResolvedValue([]),
): PrismaService {
  return { abstract: { groupBy } } as unknown as PrismaService;
}

describe('AbstractsQuery.run', () => {
  it('groups abstract counts by status for the conference', async () => {
    const groupBy = jest.fn().mockResolvedValue([
      { status: 'SUBMITTED', _count: { _all: 10 } },
      { status: 'ACCEPTED', _count: { _all: 4 } },
    ]);
    const query = new AbstractsQuery(fakePrisma(groupBy));

    const result = await query.run('conf-1');

    expect(groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { conferenceId: 'conf-1' },
      _count: { _all: true },
    });
    expect(result).toEqual({ byStatus: { SUBMITTED: 10, ACCEPTED: 4 } });
  });

  it('returns an empty breakdown when the conference has no abstracts', async () => {
    const query = new AbstractsQuery(fakePrisma());

    await expect(query.run('conf-1')).resolves.toEqual({ byStatus: {} });
  });
});
