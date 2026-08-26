import { NotFoundException } from '@nestjs/common';
import { SponsorsService } from './sponsors.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn() },
    sponsor: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

describe('SponsorsService.create', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new SponsorsService(prisma);

    await expect(
      service.create('org-1', 'conf-x', { name: 'Acme Corp', tier: 'GOLD' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a sponsor scoped to the conference', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'sponsor-1' });
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      sponsor: {
        create,
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    });
    const service = new SponsorsService(prisma);

    await service.create('org-1', 'conf-1', {
      name: 'Acme Corp',
      tier: 'GOLD',
      contactName: 'Jane',
      contactEmail: 'jane@acme.com',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        name: 'Acme Corp',
        tier: 'GOLD',
        contactName: 'Jane',
        contactEmail: 'jane@acme.com',
        logoFileId: undefined,
      },
    });
  });
});

describe('SponsorsService.findAll', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new SponsorsService(prisma);

    await expect(service.findAll('org-1', 'conf-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists sponsors for the conference', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'sponsor-1' }]);
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      sponsor: {
        create: jest.fn(),
        findMany,
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    });
    const service = new SponsorsService(prisma);

    const result = await service.findAll('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
    });
    expect(result).toEqual([{ id: 'sponsor-1' }]);
  });
});

describe('SponsorsService.update', () => {
  it('throws NotFoundException when the sponsor is outside the caller organization', async () => {
    const prisma = fakePrisma({
      sponsor: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        delete: jest.fn(),
      },
    });
    const service = new SponsorsService(prisma);

    await expect(
      service.update('org-1', 'sponsor-x', { name: 'New Name' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates only the provided fields', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'sponsor-1' });
    const prisma = fakePrisma({
      sponsor: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 'sponsor-1' }),
        update,
        delete: jest.fn(),
      },
    });
    const service = new SponsorsService(prisma);

    await service.update('org-1', 'sponsor-1', { paymentStatus: 'PAID' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'sponsor-1' },
      data: { paymentStatus: 'PAID' },
    });
  });
});

describe('SponsorsService.remove', () => {
  it('throws NotFoundException when the sponsor is outside the caller organization', async () => {
    const prisma = fakePrisma({
      sponsor: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        delete: jest.fn(),
      },
    });
    const service = new SponsorsService(prisma);

    await expect(service.remove('org-1', 'sponsor-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes the sponsor', async () => {
    const deleteFn = jest.fn();
    const prisma = fakePrisma({
      sponsor: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 'sponsor-1' }),
        update: jest.fn(),
        delete: deleteFn,
      },
    });
    const service = new SponsorsService(prisma);

    await service.remove('org-1', 'sponsor-1');

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 'sponsor-1' } });
  });
});
