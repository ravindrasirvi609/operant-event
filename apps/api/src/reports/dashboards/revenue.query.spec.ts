import { RevenueQuery } from './revenue.query';
import type { PrismaService } from '../../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    order: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { total: null } }),
    },
    payment: { groupBy: jest.fn().mockResolvedValue([]) },
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

describe('RevenueQuery.run', () => {
  it('reports total collected, revenue by payment provider, and total refunded', async () => {
    const aggregate = jest
      .fn()
      .mockResolvedValueOnce({ _sum: { total: 20000 } })
      .mockResolvedValueOnce({ _sum: { total: 500 } });
    const groupBy = jest.fn().mockResolvedValue([
      { provider: 'razorpay', _sum: { amount: 12000 } },
      { provider: 'MANUAL', _sum: { amount: 8000 } },
    ]);
    const prisma = fakePrisma({ order: { aggregate }, payment: { groupBy } });
    const query = new RevenueQuery(prisma);

    const result = await query.run('conf-1');

    expect(aggregate).toHaveBeenNthCalledWith(1, {
      where: { conferenceId: 'conf-1', status: 'PAID' },
      _sum: { total: true },
    });
    expect(groupBy).toHaveBeenCalledWith({
      by: ['provider'],
      where: { order: { conferenceId: 'conf-1' }, status: 'SUCCESS' },
      _sum: { amount: true },
    });
    expect(aggregate).toHaveBeenNthCalledWith(2, {
      where: { conferenceId: 'conf-1', status: 'REFUNDED' },
      _sum: { total: true },
    });
    expect(result).toEqual({
      totalCollected: 20000,
      byProvider: { razorpay: 12000, MANUAL: 8000 },
      totalRefunded: 500,
    });
  });

  it('defaults every figure to 0 when the conference has no payment activity yet', async () => {
    const query = new RevenueQuery(fakePrisma());

    await expect(query.run('conf-1')).resolves.toEqual({
      totalCollected: 0,
      byProvider: {},
      totalRefunded: 0,
    });
  });
});
