import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { ScheduleConflictService } from './schedule-conflict.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn(), update: jest.fn() },
    programSession: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    conferenceSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    sessionSpeaker: { deleteMany: jest.fn(), createMany: jest.fn() },
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

function fakeConflictService(
  overrides: Partial<Record<keyof ScheduleConflictService, jest.Mock>> = {},
) {
  return {
    assertValidWindow: jest.fn(),
    assertPresentationWithinSession: jest.fn(),
    assertNoAbstractDoubleBooking: jest.fn().mockResolvedValue(undefined),
    assertNoSpeakerOverlap: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ScheduleConflictService;
}

const window = {
  startTime: '2027-01-01T10:00:00Z',
  endTime: '2027-01-01T11:00:00Z',
};

describe('SessionsService.create', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await expect(
      service.create('org-1', 'conf-x', {
        title: 'Opening Keynote',
        sessionDate: '2027-01-01',
        ...window,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a window where endTime is not after startTime', async () => {
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }),
        update: jest.fn(),
      },
    });
    const conflictService = fakeConflictService({
      assertValidWindow: jest.fn(() => {
        throw new BadRequestException('endTime must be after startTime.');
      }),
    });
    const service = new SessionsService(prisma, conflictService);

    await expect(
      service.create('org-1', 'conf-1', {
        title: 'Opening Keynote',
        sessionDate: '2027-01-01',
        startTime: window.endTime,
        endTime: window.startTime,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a DRAFT session for a valid window', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'session-1', status: 'DRAFT' });
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }),
        update: jest.fn(),
      },
      programSession: {
        create,
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await service.create('org-1', 'conf-1', {
      title: 'Opening Keynote',
      trackId: 'track-1',
      description: 'Kickoff',
      room: 'Hall A',
      sessionDate: '2027-01-01',
      sessionType: 'PLENARY',
      ...window,
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        trackId: 'track-1',
        title: 'Opening Keynote',
        description: 'Kickoff',
        room: 'Hall A',
        sessionDate: new Date('2027-01-01'),
        startTime: new Date(window.startTime),
        endTime: new Date(window.endTime),
        sessionType: 'PLENARY',
        status: 'DRAFT',
      },
    });
  });
});

describe('SessionsService.update', () => {
  it('throws NotFoundException when the session is outside the caller organization', async () => {
    const prisma = fakePrisma({
      programSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await expect(
      service.update('org-1', 'session-x', { title: 'New Title' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bumps the conference scheduleVersion when editing an already-published session', async () => {
    const conferenceUpdate = jest.fn();
    const prisma = fakePrisma({
      programSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          conferenceId: 'conf-1',
          status: 'PUBLISHED',
          startTime: new Date(window.startTime),
          endTime: new Date(window.endTime),
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'session-1' }),
        findMany: jest.fn(),
      },
      conference: { findFirst: jest.fn(), update: conferenceUpdate },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await service.update('org-1', 'session-1', { title: 'Updated Title' });

    expect(conferenceUpdate).toHaveBeenCalledWith({
      where: { id: 'conf-1' },
      data: { scheduleVersion: { increment: 1 } },
    });
  });

  it('does not bump scheduleVersion when editing a DRAFT session', async () => {
    const conferenceUpdate = jest.fn();
    const prisma = fakePrisma({
      programSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          conferenceId: 'conf-1',
          status: 'DRAFT',
          startTime: new Date(window.startTime),
          endTime: new Date(window.endTime),
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'session-1' }),
        findMany: jest.fn(),
      },
      conference: { findFirst: jest.fn(), update: conferenceUpdate },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await service.update('org-1', 'session-1', { title: 'Updated Title' });

    expect(conferenceUpdate).not.toHaveBeenCalled();
  });
});

describe('SessionsService.publish', () => {
  it('throws NotFoundException when the session is outside the caller organization', async () => {
    const prisma = fakePrisma({
      programSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await expect(service.publish('org-1', 'session-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('sets the session status to PUBLISHED', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'session-1', status: 'PUBLISHED' });
    const prisma = fakePrisma({
      programSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          conferenceId: 'conf-1',
          status: 'DRAFT',
        }),
        create: jest.fn(),
        update,
        findMany: jest.fn(),
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await service.publish('org-1', 'session-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { status: 'PUBLISHED' },
    });
  });
});

describe('SessionsService.assignSpeakers', () => {
  it('throws NotFoundException when the session is outside the caller organization', async () => {
    const prisma = fakePrisma({
      programSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await expect(
      service.assignSpeakers('org-1', 'session-x', [
        { speakerId: 'speaker-1', role: 'SPEAKER' },
      ]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('skips the speaker-overlap check when preventSpeakerOverlap is disabled', async () => {
    const conflictService = fakeConflictService();
    const prisma = fakePrisma({
      programSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          conferenceId: 'conf-1',
          startTime: new Date(window.startTime),
          endTime: new Date(window.endTime),
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'session-1' }),
        findMany: jest.fn(),
      },
      conferenceSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ preventSpeakerOverlap: false }),
      },
    });
    const service = new SessionsService(prisma, conflictService);

    await service.assignSpeakers('org-1', 'session-1', [
      { speakerId: 'speaker-1', role: 'SPEAKER' },
    ]);

    expect(conflictService.assertNoSpeakerOverlap).not.toHaveBeenCalled();
  });

  it('runs the speaker-overlap check for every assignment when preventSpeakerOverlap is enabled', async () => {
    const conflictService = fakeConflictService();
    const prisma = fakePrisma({
      programSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          conferenceId: 'conf-1',
          startTime: new Date(window.startTime),
          endTime: new Date(window.endTime),
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'session-1' }),
        findMany: jest.fn(),
      },
      conferenceSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ preventSpeakerOverlap: true }),
      },
    });
    const service = new SessionsService(prisma, conflictService);

    await service.assignSpeakers('org-1', 'session-1', [
      { speakerId: 'speaker-1', role: 'SPEAKER' },
      { speakerId: 'speaker-2', role: 'CHAIR' },
    ]);

    expect(conflictService.assertNoSpeakerOverlap).toHaveBeenCalledTimes(2);
    expect(conflictService.assertNoSpeakerOverlap).toHaveBeenCalledWith(
      'speaker-1',
      'session-1',
      {
        startTime: new Date(window.startTime),
        endTime: new Date(window.endTime),
      },
    );
  });

  it('replaces existing speaker assignments and denormalizes chair/co-chair onto the session', async () => {
    const deleteMany = jest.fn();
    const createMany = jest.fn();
    const update = jest.fn().mockResolvedValue({ id: 'session-1' });
    const prisma = fakePrisma({
      programSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          conferenceId: 'conf-1',
          startTime: new Date(window.startTime),
          endTime: new Date(window.endTime),
        }),
        create: jest.fn(),
        update,
        findMany: jest.fn(),
      },
      sessionSpeaker: { deleteMany, createMany },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await service.assignSpeakers('org-1', 'session-1', [
      { speakerId: 'speaker-1', role: 'SPEAKER' },
      { speakerId: 'speaker-2', role: 'CHAIR' },
      { speakerId: 'speaker-3', role: 'CO_CHAIR' },
    ]);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { sessionId: 'session-1', speakerId: 'speaker-1', role: 'SPEAKER' },
        { sessionId: 'session-1', speakerId: 'speaker-2', role: 'CHAIR' },
        { sessionId: 'session-1', speakerId: 'speaker-3', role: 'CO_CHAIR' },
      ],
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { chairId: 'speaker-2', coChairId: 'speaker-3' },
    });
  });
});

describe('SessionsService.findAllPublished', () => {
  it('lists only PUBLISHED sessions for a conference, ordered by start time', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      programSession: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany,
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await service.findAllPublished('conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1', status: 'PUBLISHED' },
      orderBy: { startTime: 'asc' },
      include: {
        track: true,
        speakers: { include: { speaker: true } },
        presentations: true,
      },
    });
  });
});

describe('SessionsService.findOneForOrganizer', () => {
  it('throws NotFoundException when the session is outside the caller organization', async () => {
    const prisma = fakePrisma({
      programSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await expect(
      service.findOneForOrganizer('org-1', 'session-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the session with its track, speakers, and presentations included', async () => {
    const session = { id: 'session-1', title: 'Opening Keynote' };
    const findFirst = jest.fn().mockResolvedValue(session);
    const prisma = fakePrisma({
      programSession: {
        findFirst,
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    const result = await service.findOneForOrganizer('org-1', 'session-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'session-1', conference: { organizationId: 'org-1' } },
      include: {
        track: true,
        speakers: { include: { speaker: true } },
        presentations: true,
      },
    });
    expect(result).toEqual(session);
  });
});

describe('SessionsService.findAllForOrganizer', () => {
  it('throws NotFoundException when the conference is outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await expect(
      service.findAllForOrganizer('org-1', 'conf-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists every session regardless of status', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conf-1' }),
        update: jest.fn(),
      },
      programSession: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany,
      },
    });
    const service = new SessionsService(prisma, fakeConflictService());

    await service.findAllForOrganizer('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      orderBy: { startTime: 'asc' },
      include: {
        track: true,
        speakers: { include: { speaker: true } },
        presentations: true,
      },
    });
  });
});
