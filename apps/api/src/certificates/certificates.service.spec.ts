import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { CertificateEligibilityService } from './certificate-eligibility.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn() },
    conferenceSetting: {
      findUnique: jest.fn().mockResolvedValue({
        certificateEnabled: true,
        certificateShowFullName: true,
      }),
    },
    registration: { findMany: jest.fn().mockResolvedValue([]) },
    certificate: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
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

function fakeEligibility(
  isEligible: jest.Mock = jest.fn().mockResolvedValue(false),
): CertificateEligibilityService {
  return { isEligible } as unknown as CertificateEligibilityService;
}

describe('CertificatesService.generateForConference', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new CertificatesService(prisma, fakeEligibility());

    await expect(
      service.generateForConference('org-1', 'conf-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when certificates are not enabled for the conference', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      conferenceSetting: {
        findUnique: jest.fn().mockResolvedValue({ certificateEnabled: false }),
      },
    });
    const service = new CertificatesService(prisma, fakeEligibility());

    await expect(
      service.generateForConference('org-1', 'conf-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('skips a certificate type that already has a row for the registration', async () => {
    const isEligible = jest.fn().mockResolvedValue(true);
    const create = jest.fn();
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      registration: {
        findMany: jest.fn().mockResolvedValue([{ id: 'reg-1' }]),
      },
      certificate: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-certificate' }),
        findFirst: jest.fn(),
        count: jest.fn(),
        create,
        update: jest.fn(),
      },
    });
    const service = new CertificatesService(
      prisma,
      fakeEligibility(isEligible),
    );

    await service.generateForConference('org-1', 'conf-1');

    expect(isEligible).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a certificate for exactly the eligible types, skipping ineligible ones', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: `cert-${data.certificateType}`, ...data }),
      );
    const isEligible = jest
      .fn()
      .mockImplementation((certificateType: string) =>
        Promise.resolve(certificateType === 'PARTICIPATION'),
      );
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      registration: {
        findMany: jest.fn().mockResolvedValue([{ id: 'reg-1' }]),
      },
      certificate: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create,
        update: jest.fn(),
      },
    });
    const service = new CertificatesService(
      prisma,
      fakeEligibility(isEligible),
    );

    const created = await service.generateForConference('org-1', 'conf-1');

    expect(created).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conferenceId: 'conf-1',
        registrationId: 'reg-1',
        certificateType: 'PARTICIPATION',
        status: 'ELIGIBLE',
      }),
    });
  });

  it('retries with a fresh certificate number when the first candidate collides', async () => {
    const create = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({
        id: 'cert-1',
        certificateNumber: 'CERT-000002',
      });
    const isEligible = jest
      .fn()
      .mockImplementation((certificateType: string) =>
        Promise.resolve(certificateType === 'PARTICIPATION'),
      );
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      registration: {
        findMany: jest.fn().mockResolvedValue([{ id: 'reg-1' }]),
      },
      certificate: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create,
        update: jest.fn(),
      },
    });
    const service = new CertificatesService(
      prisma,
      fakeEligibility(isEligible),
    );

    const created = await service.generateForConference('org-1', 'conf-1');

    expect(create).toHaveBeenCalledTimes(2);
    expect(created).toHaveLength(1);
  });
});

describe('CertificatesService.issue', () => {
  it('throws NotFoundException when the certificate is outside the caller organization', async () => {
    const prisma = fakePrisma({
      certificate: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new CertificatesService(prisma, fakeEligibility());

    await expect(service.issue('org-1', 'cert-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('transitions an ELIGIBLE certificate to ISSUED with an issuedAt timestamp', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'cert-1', status: 'ISSUED' });
    const prisma = fakePrisma({
      certificate: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'cert-1', status: 'ELIGIBLE' }),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update,
      },
    });
    const service = new CertificatesService(prisma, fakeEligibility());

    await service.issue('org-1', 'cert-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'cert-1' },
      data: { status: 'ISSUED', issuedAt: expect.any(Date) },
    });
  });

  it('is idempotent: issuing an already-ISSUED certificate does not update it again', async () => {
    const update = jest.fn();
    const alreadyIssued = { id: 'cert-1', status: 'ISSUED' };
    const prisma = fakePrisma({
      certificate: {
        findFirst: jest.fn().mockResolvedValue(alreadyIssued),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update,
      },
    });
    const service = new CertificatesService(prisma, fakeEligibility());

    const result = await service.issue('org-1', 'cert-1');

    expect(update).not.toHaveBeenCalled();
    expect(result).toBe(alreadyIssued);
  });
});

describe('CertificatesService.findOwned', () => {
  it('throws NotFoundException when the certificate does not belong to the caller', async () => {
    const prisma = fakePrisma({
      certificate: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new CertificatesService(prisma, fakeEligibility());

    await expect(service.findOwned('user-1', 'cert-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('CertificatesService.verifyByCode', () => {
  it('throws NotFoundException for an unknown verification code', async () => {
    const prisma = fakePrisma({
      certificate: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new CertificatesService(prisma, fakeEligibility());

    await expect(service.verifyByCode('BADCODE')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException for a certificate that has not been ISSUED yet', async () => {
    const prisma = fakePrisma({
      certificate: {
        findUnique: jest.fn().mockResolvedValue({ status: 'ELIGIBLE' }),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new CertificatesService(prisma, fakeEligibility());

    await expect(service.verifyByCode('ABC123')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns only the §18 minimum fields for an ISSUED certificate, with the full holder name when configured', async () => {
    const issuedAt = new Date('2027-06-01T00:00:00Z');
    const prisma = fakePrisma({
      certificate: {
        findUnique: jest.fn().mockResolvedValue({
          certificateNumber: 'CERT-000001',
          certificateType: 'PARTICIPATION',
          status: 'ISSUED',
          issuedAt,
          conferenceId: 'conf-1',
          conference: { name: 'Operant Summit 2027' },
          registration: { user: { firstName: 'Jane', lastName: 'Doe' } },
        }),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      conferenceSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ certificateShowFullName: true }),
      },
    });
    const service = new CertificatesService(prisma, fakeEligibility());

    const result = await service.verifyByCode('ABC123');

    expect(result).toEqual({
      certificateNumber: 'CERT-000001',
      holderName: 'Jane Doe',
      conferenceName: 'Operant Summit 2027',
      certificateType: 'PARTICIPATION',
      issuedAt,
      status: 'ISSUED',
    });
  });

  it('reveals only the first-name-plus-initial when certificateShowFullName is disabled', async () => {
    const prisma = fakePrisma({
      certificate: {
        findUnique: jest.fn().mockResolvedValue({
          certificateNumber: 'CERT-000001',
          certificateType: 'PARTICIPATION',
          status: 'ISSUED',
          issuedAt: new Date('2027-06-01T00:00:00Z'),
          conferenceId: 'conf-1',
          conference: { name: 'Operant Summit 2027' },
          registration: { user: { firstName: 'Jane', lastName: 'Doe' } },
        }),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      conferenceSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ certificateShowFullName: false }),
      },
    });
    const service = new CertificatesService(prisma, fakeEligibility());

    const result = await service.verifyByCode('ABC123');

    expect(result.holderName).toBe('Jane D.');
  });
});
