import { NotFoundException } from '@nestjs/common';
import { RegistrationTypesService } from './registration-types.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    registrationCategory: { findFirst: jest.fn() },
    registrationType: { create: jest.fn() },
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

const dto = {
  name: 'Early Bird',
  price: 2000,
  currency: 'INR',
  startDate: '2027-01-01T00:00:00Z',
  endDate: '2027-02-01T00:00:00Z',
  capacity: 100,
};

describe('RegistrationTypesService.create', () => {
  it('rejects a category outside the caller organization', async () => {
    const prisma = fakePrisma({
      registrationCategory: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new RegistrationTypesService(prisma).create('org-1', 'cat-x', dto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a pricing window scoped to the category', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'type-1' });
    const prisma = fakePrisma({
      registrationCategory: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      },
      registrationType: { create },
    });

    await new RegistrationTypesService(prisma).create('org-1', 'cat-1', dto);

    expect(create).toHaveBeenCalledWith({
      data: {
        categoryId: 'cat-1',
        name: 'Early Bird',
        price: 2000,
        currency: 'INR',
        startDate: new Date('2027-01-01T00:00:00Z'),
        endDate: new Date('2027-02-01T00:00:00Z'),
        capacity: 100,
      },
    });
  });
});
