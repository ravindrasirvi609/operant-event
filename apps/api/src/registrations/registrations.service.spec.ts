import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const registration = {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    findFirst: jest.fn(),
  };
  const base = { registrationCategory: { findFirst: jest.fn() }, registration };
  const baseRecord = base as unknown as Record<
    string,
    Record<string, jest.Mock>
  >;
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(baseRecord[model], methods);
  }
  const tx = { registration: base.registration };
  return {
    ...base,
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
}

const earlyBirdType = {
  id: 'type-early',
  price: 2000,
  currency: 'INR',
  capacity: 2,
  startDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
  endDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
};

describe('RegistrationsService.register', () => {
  it('rejects a category outside the caller conference', async () => {
    const prisma = fakePrisma({
      registrationCategory: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new RegistrationsService(prisma).register('conf-1', 'user-1', 'cat-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when no pricing window is currently active', async () => {
    const expiredType = {
      ...earlyBirdType,
      endDate: new Date(Date.now() - 1000),
    };
    const prisma = fakePrisma({
      registrationCategory: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'cat-1', types: [expiredType] }),
      },
    });

    await expect(
      new RegistrationsService(prisma).register('conf-1', 'user-1', 'cat-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects registering into a category that is already at capacity', async () => {
    const prisma = fakePrisma({
      registrationCategory: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'cat-1', types: [earlyBirdType] }),
      },
      registration: {
        count: jest.fn().mockResolvedValue(2),
        create: jest.fn(),
      },
    });

    await expect(
      new RegistrationsService(prisma).register('conf-1', 'user-1', 'cat-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a PENDING registration snapshotting the effective price', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'reg-1', registrationNumber: 'REG-000001' });
    const prisma = fakePrisma({
      registrationCategory: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'cat-1', types: [earlyBirdType] }),
      },
      registration: { count: jest.fn().mockResolvedValue(0), create },
    });

    await new RegistrationsService(prisma).register(
      'conf-1',
      'user-1',
      'cat-1',
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        registrationNumber: 'REG-000001',
        userId: 'user-1',
        registrationTypeId: 'type-early',
        status: 'PENDING',
        totalAmount: 2000,
        currency: 'INR',
      },
    });
  });

  it('retries with the next registration number when the first candidate collides', async () => {
    const create = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({ id: 'reg-1', registrationNumber: 'REG-000002' });
    const prisma = fakePrisma({
      registrationCategory: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'cat-1', types: [earlyBirdType] }),
      },
      registration: { count: jest.fn().mockResolvedValue(0), create },
    });

    await new RegistrationsService(prisma).register(
      'conf-1',
      'user-1',
      'cat-1',
    );

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].data.registrationNumber).toBe('REG-000001');
    expect(create.mock.calls[1][0].data.registrationNumber).toBe('REG-000002');
  });
});
