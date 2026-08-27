import { NotFoundException } from '@nestjs/common';
import { ExportsService } from './exports.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { ExportQueueService } from './export-queue.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
    exportJob: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
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

function fakeQueue(): ExportQueueService {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
  } as unknown as ExportQueueService;
}

describe('ExportsService.create', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new ExportsService(prisma, fakeQueue());

    await expect(
      service.create('org-1', 'conf-x', 'user-1', 'ABSTRACTS'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a QUEUED ExportJob row and enqueues it for processing — never blocking on the actual export', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'export-1', status: 'QUEUED' });
    const queue = fakeQueue();
    const prisma = fakePrisma({ exportJob: { create, findFirst: jest.fn() } });
    const service = new ExportsService(prisma, queue);

    const result = await service.create(
      'org-1',
      'conf-1',
      'user-1',
      'ABSTRACTS',
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        conferenceId: 'conf-1',
        requestedBy: 'user-1',
        type: 'ABSTRACTS',
        status: 'QUEUED',
      },
    });
    expect(queue.enqueue).toHaveBeenCalledWith('export-1');
    expect(result).toEqual({ id: 'export-1', status: 'QUEUED' });
  });
});

describe('ExportsService.findById', () => {
  it('throws NotFoundException when the export job is outside the caller organization', async () => {
    const prisma = fakePrisma({
      exportJob: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new ExportsService(prisma, fakeQueue());

    await expect(service.findById('org-1', 'export-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the export job for a caller within the organization', async () => {
    const job = { id: 'export-1', status: 'DONE' };
    const prisma = fakePrisma({
      exportJob: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(job),
      },
    });
    const service = new ExportsService(prisma, fakeQueue());

    await expect(service.findById('org-1', 'export-1')).resolves.toEqual(job);
  });
});

describe('ExportsService.findAllForConference', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new ExportsService(prisma, fakeQueue());

    await expect(
      service.findAllForConference('org-1', 'conf-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists export jobs for the conference, most recent first', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'export-1' }]);
    const prisma = fakePrisma({
      exportJob: { create: jest.fn(), findFirst: jest.fn(), findMany },
    });
    const service = new ExportsService(prisma, fakeQueue());

    const result = await service.findAllForConference('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', conferenceId: 'conf-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([{ id: 'export-1' }]);
  });
});
