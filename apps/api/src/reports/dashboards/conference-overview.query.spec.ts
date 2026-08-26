import { ConferenceOverviewQuery } from './conference-overview.query';
import type { PrismaService } from '../../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    abstract: { count: jest.fn().mockResolvedValue(0) },
    registration: { count: jest.fn().mockResolvedValue(0) },
    order: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { total: null } }),
    },
    checkin: { count: jest.fn().mockResolvedValue(0) },
    certificate: { count: jest.fn().mockResolvedValue(0) },
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

describe('ConferenceOverviewQuery.run', () => {
  it('aggregates counts and revenue for the conference', async () => {
    const prisma = fakePrisma({
      abstract: { count: jest.fn().mockResolvedValue(42) },
      registration: { count: jest.fn().mockResolvedValue(120) },
      order: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { total: 15000 } }),
      },
      checkin: { count: jest.fn().mockResolvedValue(95) },
      certificate: { count: jest.fn().mockResolvedValue(60) },
    });
    const query = new ConferenceOverviewQuery(prisma);

    const result = await query.run('conf-1');

    expect(result).toEqual({
      totalAbstracts: 42,
      totalRegistrations: 120,
      totalRevenue: 15000,
      totalCheckins: 95,
      totalCertificatesIssued: 60,
    });
  });

  it('scopes every query to the conference and only counts PAID orders/ISSUED certificates', async () => {
    const abstractCount = jest.fn().mockResolvedValue(0);
    const registrationCount = jest.fn().mockResolvedValue(0);
    const orderAggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { total: null } });
    const checkinCount = jest.fn().mockResolvedValue(0);
    const certificateCount = jest.fn().mockResolvedValue(0);
    const prisma = fakePrisma({
      abstract: { count: abstractCount },
      registration: { count: registrationCount },
      order: { aggregate: orderAggregate },
      checkin: { count: checkinCount },
      certificate: { count: certificateCount },
    });
    const query = new ConferenceOverviewQuery(prisma);

    await query.run('conf-1');

    expect(abstractCount).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
    });
    expect(registrationCount).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
    });
    expect(orderAggregate).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1', status: 'PAID' },
      _sum: { total: true },
    });
    expect(checkinCount).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
    });
    expect(certificateCount).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1', status: 'ISSUED' },
    });
  });

  it('defaults total revenue to 0 when no orders have been paid yet', async () => {
    const prisma = fakePrisma();
    const query = new ConferenceOverviewQuery(prisma);

    const result = await query.run('conf-1');

    expect(result.totalRevenue).toBe(0);
  });
});
