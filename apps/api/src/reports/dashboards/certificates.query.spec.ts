import { CertificatesQuery } from './certificates.query';
import type { PrismaService } from '../../common/prisma/prisma.service';

function fakePrisma(
  groupBy: jest.Mock = jest.fn().mockResolvedValue([]),
): PrismaService {
  return { certificate: { groupBy } } as unknown as PrismaService;
}

describe('CertificatesQuery.run', () => {
  it('groups certificate counts by type and status', async () => {
    const groupBy = jest.fn().mockResolvedValue([
      {
        certificateType: 'PARTICIPATION',
        status: 'ISSUED',
        _count: { _all: 80 },
      },
      { certificateType: 'SPEAKER', status: 'ELIGIBLE', _count: { _all: 5 } },
    ]);
    const query = new CertificatesQuery(fakePrisma(groupBy));

    const result = await query.run('conf-1');

    expect(groupBy).toHaveBeenCalledWith({
      by: ['certificateType', 'status'],
      where: { conferenceId: 'conf-1' },
      _count: { _all: true },
    });
    expect(result).toEqual({
      byTypeAndStatus: {
        PARTICIPATION: { ISSUED: 80 },
        SPEAKER: { ELIGIBLE: 5 },
      },
    });
  });

  it('returns an empty breakdown when no certificates have been generated', async () => {
    const query = new CertificatesQuery(fakePrisma());

    await expect(query.run('conf-1')).resolves.toEqual({ byTypeAndStatus: {} });
  });
});
