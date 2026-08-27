import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImportsService } from './imports.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { ImportQueueService } from './import-queue.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
    file: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'file-1', organizationId: 'org-1' }),
    },
    importJob: {
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

function fakeQueue(): ImportQueueService {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
  } as unknown as ImportQueueService;
}

describe('ImportsService.create', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new ImportsService(prisma, fakeQueue());

    await expect(
      service.create('org-1', 'conf-x', 'user-1', 'AUTHORS', 'file-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when the source file does not belong to the caller organization', async () => {
    const prisma = fakePrisma({
      file: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new ImportsService(prisma, fakeQueue());

    await expect(
      service.create('org-1', 'conf-1', 'user-1', 'AUTHORS', 'file-x'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a QUEUED ImportJob row and enqueues it for processing', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'import-1', status: 'QUEUED' });
    const queue = fakeQueue();
    const prisma = fakePrisma({ importJob: { create, findFirst: jest.fn() } });
    const service = new ImportsService(prisma, queue);

    const result = await service.create(
      'org-1',
      'conf-1',
      'user-1',
      'AUTHORS',
      'file-1',
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        conferenceId: 'conf-1',
        requestedBy: 'user-1',
        type: 'AUTHORS',
        sourceFileId: 'file-1',
        status: 'QUEUED',
      },
    });
    expect(queue.enqueue).toHaveBeenCalledWith('import-1');
    expect(result).toEqual({ id: 'import-1', status: 'QUEUED' });
  });
});

describe('ImportsService.findById', () => {
  it('throws NotFoundException when the import job is outside the caller organization', async () => {
    const prisma = fakePrisma({
      importJob: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new ImportsService(prisma, fakeQueue());

    await expect(service.findById('org-1', 'import-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the import job, including row-level progress, for a caller within the organization', async () => {
    const job = {
      id: 'import-1',
      status: 'DONE',
      rowsProcessed: 40,
      rowsFailed: 2,
      errorReportFileId: 'file-err',
    };
    const prisma = fakePrisma({
      importJob: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(job),
      },
    });
    const service = new ImportsService(prisma, fakeQueue());

    await expect(service.findById('org-1', 'import-1')).resolves.toEqual(job);
  });
});

describe('ImportsService.findAllForConference', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new ImportsService(prisma, fakeQueue());

    await expect(
      service.findAllForConference('org-1', 'conf-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists import jobs for the conference, most recent first', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'import-1' }]);
    const prisma = fakePrisma({
      importJob: { create: jest.fn(), findFirst: jest.fn(), findMany },
    });
    const service = new ImportsService(prisma, fakeQueue());

    const result = await service.findAllForConference('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', conferenceId: 'conf-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([{ id: 'import-1' }]);
  });
});
