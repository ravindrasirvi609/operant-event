import { NotFoundException } from '@nestjs/common';
import { SpeakersService } from './speakers.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn() },
    speaker: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    sessionSpeaker: { deleteMany: jest.fn() },
    programSession: { updateMany: jest.fn() },
    $transaction: jest.fn((callback: (transaction: unknown) => unknown) =>
      callback(base),
    ),
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

describe('SpeakersService.create', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new SpeakersService(prisma);

    await expect(
      service.create('org-1', 'conf-x', { name: 'Dr. Jane Doe' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a speaker profile scoped to the conference', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'speaker-1' });
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      speaker: { create, findMany: jest.fn() },
    });
    const service = new SpeakersService(prisma);

    await service.create('org-1', 'conf-1', {
      name: 'Dr. Jane Doe',
      designation: 'Professor',
      institution: 'MIT',
      bio: 'Keynote speaker',
      country: 'USA',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        userId: undefined,
        name: 'Dr. Jane Doe',
        designation: 'Professor',
        institution: 'MIT',
        bio: 'Keynote speaker',
        photoFileId: undefined,
        country: 'USA',
      },
    });
  });
});

describe('SpeakersService.update', () => {
  it('throws NotFoundException when the speaker is outside the caller organization', async () => {
    const prisma = fakePrisma({
      speaker: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        delete: jest.fn(),
      },
    });
    const service = new SpeakersService(prisma);

    await expect(
      service.update('org-1', 'speaker-x', { name: 'New Name' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates only the provided fields', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'speaker-1' });
    const prisma = fakePrisma({
      speaker: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 'speaker-1' }),
        update,
        delete: jest.fn(),
      },
    });
    const service = new SpeakersService(prisma);

    await service.update('org-1', 'speaker-1', { bio: 'Updated bio' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'speaker-1' },
      data: { bio: 'Updated bio' },
    });
  });
});

describe('SpeakersService.remove', () => {
  it('throws NotFoundException when the speaker is outside the caller organization', async () => {
    const prisma = fakePrisma({
      speaker: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        delete: jest.fn(),
      },
    });
    const service = new SpeakersService(prisma);

    await expect(service.remove('org-1', 'speaker-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('clears session-speaker links and chair/co-chair references before deleting the speaker', async () => {
    const deleteMany = jest.fn().mockResolvedValue(undefined);
    const updateMany = jest.fn().mockResolvedValue(undefined);
    const del = jest.fn().mockResolvedValue({ id: 'speaker-1' });
    const prisma = fakePrisma({
      speaker: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 'speaker-1' }),
        update: jest.fn(),
        delete: del,
      },
      sessionSpeaker: { deleteMany },
      programSession: { updateMany },
    });
    const service = new SpeakersService(prisma);

    await service.remove('org-1', 'speaker-1');

    expect(deleteMany).toHaveBeenCalledWith({
      where: { speakerId: 'speaker-1' },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { chairId: 'speaker-1' },
      data: { chairId: null },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { coChairId: 'speaker-1' },
      data: { coChairId: null },
    });
    expect(del).toHaveBeenCalledWith({ where: { id: 'speaker-1' } });
  });
});

describe('SpeakersService.findAll', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new SpeakersService(prisma);

    await expect(service.findAll('org-1', 'conf-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists speakers for the conference', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'speaker-1' }]);
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      speaker: { create: jest.fn(), findMany },
    });
    const service = new SpeakersService(prisma);

    const result = await service.findAll('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
    });
    expect(result).toEqual([{ id: 'speaker-1' }]);
  });
});
