import { NotFoundException } from '@nestjs/common';
import { ExhibitorsService } from './exhibitors.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn() },
    exhibitor: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    exhibitorStaff: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
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

describe('ExhibitorsService.create', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new ExhibitorsService(prisma);

    await expect(
      service.create('org-1', 'conf-x', { companyName: 'Acme Corp' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates an exhibitor scoped to the conference', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'exhibitor-1' });
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      exhibitor: {
        create,
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new ExhibitorsService(prisma);

    await service.create('org-1', 'conf-1', {
      companyName: 'Acme Corp',
      boothNumber: 'A1',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        companyName: 'Acme Corp',
        boothNumber: 'A1',
        contactPerson: undefined,
      },
    });
  });
});

describe('ExhibitorsService.findAll', () => {
  it('lists exhibitors with staff included', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      exhibitor: {
        create: jest.fn(),
        findMany,
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new ExhibitorsService(prisma);

    await service.findAll('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      include: { staff: true },
    });
  });
});

describe('ExhibitorsService.update', () => {
  it('throws NotFoundException when the exhibitor is outside the caller organization', async () => {
    const prisma = fakePrisma({
      exhibitor: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    const service = new ExhibitorsService(prisma);

    await expect(
      service.update('org-1', 'exhibitor-x', { paymentStatus: 'PAID' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ExhibitorsService.addStaff', () => {
  it('throws NotFoundException when the exhibitor is outside the caller organization', async () => {
    const prisma = fakePrisma({
      exhibitor: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    const service = new ExhibitorsService(prisma);

    await expect(
      service.addStaff('org-1', 'exhibitor-x', { name: 'Jane' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a staff row for the exhibitor', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'staff-1' });
    const prisma = fakePrisma({
      exhibitor: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 'exhibitor-1' }),
        update: jest.fn(),
      },
      exhibitorStaff: {
        create,
        findMany: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
    });
    const service = new ExhibitorsService(prisma);

    await service.addStaff('org-1', 'exhibitor-1', {
      name: 'Jane',
      email: 'jane@acme.com',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        exhibitorId: 'exhibitor-1',
        name: 'Jane',
        email: 'jane@acme.com',
      },
    });
  });
});

describe('ExhibitorsService.removeStaff', () => {
  it('throws NotFoundException when the staff row is outside the caller organization', async () => {
    const prisma = fakePrisma({
      exhibitorStaff: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new ExhibitorsService(prisma);

    await expect(
      service.removeStaff('org-1', 'staff-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes the staff row', async () => {
    const deleteFn = jest.fn();
    const prisma = fakePrisma({
      exhibitorStaff: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: deleteFn,
        findFirst: jest.fn().mockResolvedValue({ id: 'staff-1' }),
      },
    });
    const service = new ExhibitorsService(prisma);

    await service.removeStaff('org-1', 'staff-1');

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 'staff-1' } });
  });
});
