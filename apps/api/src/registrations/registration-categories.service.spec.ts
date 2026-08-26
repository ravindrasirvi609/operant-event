import { NotFoundException } from '@nestjs/common';
import { RegistrationCategoriesService } from './registration-categories.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn() },
    registrationCategory: { create: jest.fn(), findMany: jest.fn() },
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

describe('RegistrationCategoriesService.create', () => {
  it('rejects a conference outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new RegistrationCategoriesService(prisma).create('org-1', 'conf-x', {
        name: 'Student',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a category scoped to the conference', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'cat-1', name: 'Student' });
    const prisma = fakePrisma({
      conference: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'conf-1', organizationId: 'org-1' }),
      },
      registrationCategory: { create },
    });

    await new RegistrationCategoriesService(prisma).create('org-1', 'conf-1', {
      name: 'Student',
    });

    expect(create).toHaveBeenCalledWith({
      data: { conferenceId: 'conf-1', name: 'Student', description: undefined },
    });
  });
});

describe('RegistrationCategoriesService.findAll', () => {
  it('lists categories with their pricing types', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      conference: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'conf-1', organizationId: 'org-1' }),
      },
      registrationCategory: { findMany },
    });

    await new RegistrationCategoriesService(prisma).findAll('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      include: { types: true },
    });
  });
});
