import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConferencesService } from './conferences.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
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

const validDto = {
  name: 'APTICON 2027',
  startDate: '2027-01-10',
  endDate: '2027-01-12',
  timezone: 'Asia/Kolkata',
};

describe('ConferencesService.create', () => {
  it('creates a DRAFT conference scoped to the organization with a derived slug', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'conf-1',
      name: 'APTICON 2027',
      slug: 'apticon-2027',
    });
    const prisma = fakePrisma({
      conference: { findUnique: jest.fn().mockResolvedValue(null), create },
    });

    await new ConferencesService(prisma).create('org-1', 'user-1', validDto);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        name: 'APTICON 2027',
        slug: 'apticon-2027',
        status: 'DRAFT',
        createdBy: 'user-1',
      }),
    });
  });

  it('throws ConflictException when the slug is already used within the organization', async () => {
    const prisma = fakePrisma({
      conference: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing' }),
      },
    });

    await expect(
      new ConferencesService(prisma).create('org-1', 'user-1', validDto),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ConferencesService.findOne', () => {
  it('returns the conference when it belongs to the organization', async () => {
    const conference = { id: 'conf-1', organizationId: 'org-1' };
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(conference) },
    });

    const result = await new ConferencesService(prisma).findOne(
      'org-1',
      'conf-1',
    );

    expect(result).toBe(conference);
  });

  it('throws NotFoundException when the conference belongs to a different organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new ConferencesService(prisma).findOne('org-1', 'conf-in-another-org'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ConferencesService.changeStatus', () => {
  it('applies a valid status transition', async () => {
    const conference = {
      id: 'conf-1',
      organizationId: 'org-1',
      status: 'OPEN',
    };
    const update = jest
      .fn()
      .mockResolvedValue({ ...conference, status: 'REVIEW' });
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue(conference),
        update,
      },
    });

    await new ConferencesService(prisma).changeStatus(
      'org-1',
      'conf-1',
      'REVIEW',
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'conf-1' },
      data: { status: 'REVIEW' },
    });
  });

  it('rejects an invalid status transition', async () => {
    const conference = {
      id: 'conf-1',
      organizationId: 'org-1',
      status: 'DRAFT',
    };
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(conference) },
    });

    await expect(
      new ConferencesService(prisma).changeStatus('org-1', 'conf-1', 'ONGOING'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ConferencesService.publish', () => {
  it('publishes (DRAFT -> OPEN) when settings are complete', async () => {
    const conference = {
      id: 'conf-1',
      organizationId: 'org-1',
      status: 'DRAFT',
      settings: {
        abstractEnabled: false,
        abstractStartDate: null,
        abstractEndDate: null,
        registrationEnabled: false,
        registrationStartDate: null,
        registrationEndDate: null,
      },
    };
    const update = jest
      .fn()
      .mockResolvedValue({ ...conference, status: 'OPEN' });
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue(conference),
        update,
      },
    });

    await new ConferencesService(prisma).publish('org-1', 'conf-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'conf-1' },
      data: { status: 'OPEN' },
    });
  });

  it('rejects publishing with a list of missing settings', async () => {
    const conference = {
      id: 'conf-1',
      organizationId: 'org-1',
      status: 'DRAFT',
      settings: {
        abstractEnabled: true,
        abstractStartDate: null,
        abstractEndDate: null,
        registrationEnabled: false,
        registrationStartDate: null,
        registrationEndDate: null,
      },
    };
    const update = jest.fn();
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue(conference),
        update,
      },
    });

    await expect(
      new ConferencesService(prisma).publish('org-1', 'conf-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });
});
