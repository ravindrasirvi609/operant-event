import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
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

describe('NotificationsService.notify', () => {
  it('creates a notification row', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'notif-1' });
    const prisma = fakePrisma({
      notification: {
        create,
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new NotificationsService(prisma);

    await service.notify(
      'org-1',
      'user-1',
      'abstract.accepted',
      'Abstract accepted',
      'Your abstract was accepted.',
      {
        abstractTitle: 'My Paper',
      },
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        userId: 'user-1',
        type: 'abstract.accepted',
        title: 'Abstract accepted',
        message: 'Your abstract was accepted.',
        data: { abstractTitle: 'My Paper' },
      },
    });
  });
});

describe('NotificationsService.findMine', () => {
  it('lists the caller notifications, most recent first', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      notification: {
        create: jest.fn(),
        findMany,
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new NotificationsService(prisma);

    await service.findMine('user-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('NotificationsService.markRead', () => {
  it('throws NotFoundException when the notification does not belong to the caller', async () => {
    const prisma = fakePrisma({
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    const service = new NotificationsService(prisma);

    await expect(service.markRead('user-1', 'notif-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('sets readAt when previously unread', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'notif-1', readAt: new Date() });
    const prisma = fakePrisma({
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 'notif-1', readAt: null }),
        update,
      },
    });
    const service = new NotificationsService(prisma);

    await service.markRead('user-1', 'notif-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: { readAt: expect.any(Date) },
    });
  });

  it('is idempotent: marking an already-read notification does not update it again', async () => {
    const update = jest.fn();
    const alreadyRead = {
      id: 'notif-1',
      readAt: new Date('2027-01-01T00:00:00Z'),
    };
    const prisma = fakePrisma({
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(alreadyRead),
        update,
      },
    });
    const service = new NotificationsService(prisma);

    const result = await service.markRead('user-1', 'notif-1');

    expect(update).not.toHaveBeenCalled();
    expect(result).toBe(alreadyRead);
  });
});
