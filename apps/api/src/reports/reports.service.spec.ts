import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { DASHBOARDS } from './dashboard.constants';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { ConferenceOverviewQuery } from './dashboards/conference-overview.query';
import type { AbstractsQuery } from './dashboards/abstracts.query';
import type { ReviewQuery } from './dashboards/review.query';
import type { RegistrationQuery } from './dashboards/registration.query';
import type { RevenueQuery } from './dashboards/revenue.query';
import type { AttendanceQuery } from './dashboards/attendance.query';
import type { CertificatesQuery } from './dashboards/certificates.query';

function fakePrisma(
  conferenceFindFirst: jest.Mock = jest
    .fn()
    .mockResolvedValue({ id: 'conf-1' }),
): PrismaService {
  return {
    conference: { findFirst: conferenceFindFirst },
  } as unknown as PrismaService;
}

function fakeQuery<T>(result: T): { run: jest.Mock } {
  return { run: jest.fn().mockResolvedValue(result) };
}

function buildService(
  overrides: {
    prisma?: PrismaService;
    conferenceOverview?: { run: jest.Mock };
    abstracts?: { run: jest.Mock };
    review?: { run: jest.Mock };
    registration?: { run: jest.Mock };
    revenue?: { run: jest.Mock };
    attendance?: { run: jest.Mock };
    certificates?: { run: jest.Mock };
  } = {},
) {
  return new ReportsService(
    overrides.prisma ?? fakePrisma(),
    (overrides.conferenceOverview ??
      fakeQuery({})) as unknown as ConferenceOverviewQuery,
    (overrides.abstracts ?? fakeQuery({})) as unknown as AbstractsQuery,
    (overrides.review ?? fakeQuery({})) as unknown as ReviewQuery,
    (overrides.registration ?? fakeQuery({})) as unknown as RegistrationQuery,
    (overrides.revenue ?? fakeQuery({})) as unknown as RevenueQuery,
    (overrides.attendance ?? fakeQuery({})) as unknown as AttendanceQuery,
    (overrides.certificates ?? fakeQuery({})) as unknown as CertificatesQuery,
  );
}

describe('ReportsService.getDashboard — tenant scoping', () => {
  it('rejects a conferenceId belonging to another organization before touching any dashboard data', async () => {
    const conferenceOverview = fakeQuery({});
    const service = buildService({
      prisma: fakePrisma(jest.fn().mockResolvedValue(null)),
      conferenceOverview,
    });

    await expect(
      service.getDashboard(
        'org-1',
        'conf-belongs-to-other-org',
        DASHBOARDS.CONFERENCE_OVERVIEW,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(conferenceOverview.run).not.toHaveBeenCalled();
  });
});

describe('ReportsService.getDashboard — dispatch', () => {
  it('dispatches CONFERENCE_OVERVIEW to ConferenceOverviewQuery', async () => {
    const query = fakeQuery({ marker: 'conference-overview' });
    const service = buildService({ conferenceOverview: query });

    const result = await service.getDashboard(
      'org-1',
      'conf-1',
      DASHBOARDS.CONFERENCE_OVERVIEW,
    );

    expect(query.run).toHaveBeenCalledWith('conf-1');
    expect(result).toEqual({ marker: 'conference-overview' });
  });

  it('dispatches ABSTRACTS to AbstractsQuery', async () => {
    const query = fakeQuery({ marker: 'abstracts' });
    const service = buildService({ abstracts: query });

    const result = await service.getDashboard(
      'org-1',
      'conf-1',
      DASHBOARDS.ABSTRACTS,
    );

    expect(query.run).toHaveBeenCalledWith('conf-1');
    expect(result).toEqual({ marker: 'abstracts' });
  });

  it('dispatches REVIEW to ReviewQuery', async () => {
    const query = fakeQuery({ marker: 'review' });
    const service = buildService({ review: query });

    const result = await service.getDashboard(
      'org-1',
      'conf-1',
      DASHBOARDS.REVIEW,
    );

    expect(query.run).toHaveBeenCalledWith('conf-1');
    expect(result).toEqual({ marker: 'review' });
  });

  it('dispatches REGISTRATION to RegistrationQuery', async () => {
    const query = fakeQuery({ marker: 'registration' });
    const service = buildService({ registration: query });

    const result = await service.getDashboard(
      'org-1',
      'conf-1',
      DASHBOARDS.REGISTRATION,
    );

    expect(query.run).toHaveBeenCalledWith('conf-1');
    expect(result).toEqual({ marker: 'registration' });
  });

  it('dispatches REVENUE to RevenueQuery', async () => {
    const query = fakeQuery({ marker: 'revenue' });
    const service = buildService({ revenue: query });

    const result = await service.getDashboard(
      'org-1',
      'conf-1',
      DASHBOARDS.REVENUE,
    );

    expect(query.run).toHaveBeenCalledWith('conf-1');
    expect(result).toEqual({ marker: 'revenue' });
  });

  it('dispatches ATTENDANCE to AttendanceQuery', async () => {
    const query = fakeQuery({ marker: 'attendance' });
    const service = buildService({ attendance: query });

    const result = await service.getDashboard(
      'org-1',
      'conf-1',
      DASHBOARDS.ATTENDANCE,
    );

    expect(query.run).toHaveBeenCalledWith('conf-1');
    expect(result).toEqual({ marker: 'attendance' });
  });

  it('dispatches CERTIFICATES to CertificatesQuery', async () => {
    const query = fakeQuery({ marker: 'certificates' });
    const service = buildService({ certificates: query });

    const result = await service.getDashboard(
      'org-1',
      'conf-1',
      DASHBOARDS.CERTIFICATES,
    );

    expect(query.run).toHaveBeenCalledWith('conf-1');
    expect(result).toEqual({ marker: 'certificates' });
  });

  it('throws NotFoundException for an unrecognized dashboard key', async () => {
    const service = buildService();

    await expect(
      service.getDashboard('org-1', 'conf-1', 'not-a-real-dashboard'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
