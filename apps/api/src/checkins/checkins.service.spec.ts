
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CheckinsService } from './checkins.service';
import type { PrismaService } from '../common/prisma/prisma.service';


type MockMethods = Record<string, jest.Mock>;

function fakePrisma(
  overrides: Record<string, MockMethods> = {},
  queryRaw: jest.Mock = jest
    .fn()
    .mockResolvedValue([{ id: 'reg-1' }]),
) {
  const base = {
    conference: {
      findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }),
    },
    registration: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    checkin: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    attendance: {
      create: jest.fn(),
    },
    $queryRaw: queryRaw,
  };

  const baseRecord = base as unknown as Record<string, MockMethods>;

  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(baseRecord[model], methods);
  }

  return {
    ...base,
    $transaction: jest.fn(
      (callback: (transaction: unknown) => unknown) => callback(base),
    ),
  } as unknown as PrismaService;
}


const confirmedRegistration = {
  id: 'reg-1',
  status: 'CONFIRMED',
  conferenceId: 'conf-1',
};

describe('CheckinsService.checkin', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new CheckinsService(prisma);

    await expect(
      service.checkin('org-1', {
        conferenceId: 'conf-x',
        qrCode: 'ABC123',
        checkinType: 'MAIN_EVENT',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolves a registration by qrCode', async () => {
    const findFirst = jest.fn().mockResolvedValue(confirmedRegistration);
    const prisma = fakePrisma({
      registration: { findFirst, update: jest.fn() },
    });
    const service = new CheckinsService(prisma);

    await service.checkin('org-1', {
      conferenceId: 'conf-1',
      qrCode: 'ABC123',
      checkinType: 'MAIN_EVENT',
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1', qrCode: 'ABC123' },
    });
  });

  it('resolves a registration by registrationNumber as a manual fallback', async () => {
    const findFirst = jest.fn().mockResolvedValue(confirmedRegistration);
    const prisma = fakePrisma({
      registration: { findFirst, update: jest.fn() },
    });
    const service = new CheckinsService(prisma);

    await service.checkin('org-1', {
      conferenceId: 'conf-1',
      registrationNumber: 'REG-000001',
      checkinType: 'MAIN_EVENT',
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1', registrationNumber: 'REG-000001' },
    });
  });

  it('resolves a registration by email as a manual fallback', async () => {
    const findFirst = jest.fn().mockResolvedValue(confirmedRegistration);
    const prisma = fakePrisma({
      registration: { findFirst, update: jest.fn() },
    });
    const service = new CheckinsService(prisma);

    await service.checkin('org-1', {
      conferenceId: 'conf-1',
      email: 'jane@example.com',
      checkinType: 'MAIN_EVENT',
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1', user: { email: 'jane@example.com' } },
    });
  });

  it('throws BadRequestException when no lookup key is provided', async () => {
    const prisma = fakePrisma();
    const service = new CheckinsService(prisma);

    await expect(
      service.checkin('org-1', {
        conferenceId: 'conf-1',
        checkinType: 'MAIN_EVENT',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when no registration matches', async () => {
    const prisma = fakePrisma({
      registration: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    const service = new CheckinsService(prisma);

    await expect(
      service.checkin('org-1', {
        conferenceId: 'conf-1',
        qrCode: 'ABC123',
        checkinType: 'MAIN_EVENT',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects checking in a registration that was never confirmed', async () => {
    const prisma = fakePrisma({
      registration: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            ...confirmedRegistration,
            status: 'PENDING',
          }),
        update: jest.fn(),
      },
    });
    const service = new CheckinsService(prisma);

    await expect(
      service.checkin('org-1', {
        conferenceId: 'conf-1',
        qrCode: 'ABC123',
        checkinType: 'MAIN_EVENT',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is idempotent: returns the existing check-in after acquiring the lock', async () => {
    const existingCheckin = { id: 'checkin-1' };
    const create = jest.fn();
    const checkinFindFirst = jest.fn().mockResolvedValue(existingCheckin);
    const queryRaw = jest.fn().mockResolvedValue([{ id: 'reg-1' }]);

    const prisma = fakePrisma({
      registration: {
        findFirst: jest.fn().mockResolvedValue(confirmedRegistration),
        update: jest.fn(),
      },
      checkin: {
        findFirst: checkinFindFirst,
        create,
        findMany: jest.fn(),
      },
    }, queryRaw);
    const service = new CheckinsService(prisma);

    const result = await service.checkin('org-1', {
      conferenceId: 'conf-1',
      qrCode: 'ABC123',
      checkinType: 'MAIN_EVENT',
    });

    expect(queryRaw).toHaveBeenCalled();
    expect(checkinFindFirst).toHaveBeenCalledWith({
  where: {
    conferenceId: 'conf-1',
    registrationId: 'reg-1',
    checkinType: 'MAIN_EVENT',
  },
  orderBy: { checkedInAt: 'asc' },
});
    expect(result).toEqual({
      checkin: existingCheckin,
      reused: true,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('records a new check-in, records attendance, and marks the registration CHECKED_IN', async () => {
    const createdCheckin = { id: 'checkin-1' };
    const create = jest.fn().mockResolvedValue(createdCheckin);
    const attendanceCreate = jest.fn();
    const registrationUpdate = jest.fn();
    const queryRaw = jest.fn().mockResolvedValue([{ id: 'reg-1' }]);

    const prisma = fakePrisma({
      registration: {
        findFirst: jest.fn().mockResolvedValue(confirmedRegistration),
        update: registrationUpdate,
      },
      checkin: {
        findFirst: jest.fn().mockResolvedValue(null),
        create,
        findMany: jest.fn(),
      },
      attendance: { create: attendanceCreate },
    },  queryRaw);
    const service = new CheckinsService(prisma);

    const result = await service.checkin('org-1', {
      conferenceId: 'conf-1',
      qrCode: 'ABC123',
      checkinType: 'SESSION',
      sessionId: 'session-1',
      deviceId: 'scanner-1',
    });

    expect(queryRaw).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        registrationId: 'reg-1',
        checkinType: 'SESSION',
        deviceId: 'scanner-1',
      },
    });
    expect(attendanceCreate).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        registrationId: 'reg-1',
        sessionId: 'session-1',
      },
    });
    expect(registrationUpdate).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: { status: 'CHECKED_IN' },
    });
    expect(result).toEqual({
      checkin: createdCheckin,
      reused: false,
    });
  });

  it('reuses an existing MAIN_EVENT check-in even when allowReentry is true', async () => {
  const existingCheckin = { id: 'existing-checkin' };
  const create = jest.fn();
  const checkinFindFirst = jest.fn().mockResolvedValue(existingCheckin);

  const prisma = fakePrisma({
    registration: {
      findFirst: jest.fn().mockResolvedValue(confirmedRegistration),
      update: jest.fn(),
    },
    checkin: {
      findFirst: checkinFindFirst,
      create,
      findMany: jest.fn(),
    },
  });

  const service = new CheckinsService(prisma);

  const result = await service.checkin('org-1', {
    conferenceId: 'conf-1',
    qrCode: 'ABC123',
    checkinType: 'MAIN_EVENT',
    allowReentry: true,
  });

  expect(checkinFindFirst).toHaveBeenCalledWith({
    where: {
      conferenceId: 'conf-1',
      registrationId: 'reg-1',
      checkinType: 'MAIN_EVENT',
    },
    orderBy: { checkedInAt: 'asc' },
  });

  expect(create).not.toHaveBeenCalled();
  expect(result).toEqual({
    checkin: existingCheckin,
    reused: true,
  });
});
});

describe('CheckinsService.findAllForConference', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new CheckinsService(prisma);

    await expect(
      service.findAllForConference('org-1', 'conf-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists check-ins for the conference, most recent first', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      checkin: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany,
      },
    });
    const service = new CheckinsService(prisma);

    await service.findAllForConference('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      orderBy: { checkedInAt: 'desc' },
      include: { registration: true },
    });
  });
});
