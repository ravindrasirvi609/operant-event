import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TracksService } from './tracks.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn() },
    conferenceTrack: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
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

const inOrg = { id: 'conf-1', organizationId: 'org-1' };

describe('TracksService.create', () => {
  it('rejects a conference outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new TracksService(prisma).create('org-1', 'conf-x', {
        name: 'Clinical Research',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('appends the new track after the existing ones', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'track-3', sortOrder: 2 });
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(inOrg) },
      conferenceTrack: { count: jest.fn().mockResolvedValue(2), create },
    });

    await new TracksService(prisma).create('org-1', 'conf-1', {
      name: 'AI in Healthcare',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        name: 'AI in Healthcare',
        code: undefined,
        description: undefined,
        sortOrder: 2,
      },
    });
  });
});

describe('TracksService.findPublishedForSubmission', () => {
  it('lists only ACTIVE tracks for the conference, no organization check', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'track-1', status: 'ACTIVE' }]);
    const prisma = fakePrisma({ conferenceTrack: { findMany } });

    const result = await new TracksService(prisma).findPublishedForSubmission(
      'conf-1',
    );

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1', status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
    });
    expect(result).toEqual([{ id: 'track-1', status: 'ACTIVE' }]);
  });
});

describe('TracksService.reorder', () => {
  it('sets sortOrder to match the given order when the id set matches exactly', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(inOrg) },
      conferenceTrack: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'track-a' }, { id: 'track-b' }]),
        update,
      },
    });

    await new TracksService(prisma).reorder('org-1', 'conf-1', [
      'track-b',
      'track-a',
    ]);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'track-b' },
      data: { sortOrder: 0 },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'track-a' },
      data: { sortOrder: 1 },
    });
  });

  it('rejects a reorder list that omits an existing track', async () => {
    const update = jest.fn();
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(inOrg) },
      conferenceTrack: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'track-a' }, { id: 'track-b' }]),
        update,
      },
    });

    await expect(
      new TracksService(prisma).reorder('org-1', 'conf-1', ['track-a']),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a reorder list that includes an id the conference does not own', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(inOrg) },
      conferenceTrack: {
        findMany: jest.fn().mockResolvedValue([{ id: 'track-a' }]),
      },
    });

    await expect(
      new TracksService(prisma).reorder('org-1', 'conf-1', [
        'track-a',
        'track-from-elsewhere',
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
