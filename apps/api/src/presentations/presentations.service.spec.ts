import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PresentationsService } from './presentations.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { ScheduleConflictService } from '../sessions/schedule-conflict.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    programSession: { findFirst: jest.fn() },
    abstract: { findFirst: jest.fn() },
    presentationAssignment: { create: jest.fn() },
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

const session = {
  id: 'session-1',
  conferenceId: 'conf-1',
  startTime: new Date('2027-01-01T09:00:00Z'),
  endTime: new Date('2027-01-01T12:00:00Z'),
};

const acceptedAbstract = {
  id: 'abstract-1',
  conferenceId: 'conf-1',
  status: 'ACCEPTED',
};

const presentationWindow = {
  startTime: '2027-01-01T10:00:00Z',
  endTime: '2027-01-01T10:30:00Z',
};

describe('PresentationsService.assign', () => {
  it('throws NotFoundException when the session is outside the caller organization', async () => {
    const prisma = fakePrisma({
      programSession: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new PresentationsService(prisma, fakeConflictService());

    await expect(
      service.assign('org-1', 'session-x', {
        abstractId: 'abstract-1',
        ...presentationWindow,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the abstract does not belong to the same conference', async () => {
    const prisma = fakePrisma({
      programSession: { findFirst: jest.fn().mockResolvedValue(session) },
      abstract: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new PresentationsService(prisma, fakeConflictService());

    await expect(
      service.assign('org-1', 'session-1', {
        abstractId: 'abstract-x',
        ...presentationWindow,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an abstract that has not been ACCEPTED', async () => {
    const prisma = fakePrisma({
      programSession: { findFirst: jest.fn().mockResolvedValue(session) },
      abstract: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ ...acceptedAbstract, status: 'SUBMITTED' }),
      },
    });
    const service = new PresentationsService(prisma, fakeConflictService());

    await expect(
      service.assign('org-1', 'session-1', {
        abstractId: 'abstract-1',
        ...presentationWindow,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a presentation window outside the session boundaries', async () => {
    const conflictService = fakeConflictService({
      assertPresentationWithinSession: jest.fn(() => {
        throw new BadRequestException(
          "Presentation time must fall within the session's time window.",
        );
      }),
    });
    const prisma = fakePrisma({
      programSession: { findFirst: jest.fn().mockResolvedValue(session) },
      abstract: { findFirst: jest.fn().mockResolvedValue(acceptedAbstract) },
    });
    const service = new PresentationsService(prisma, conflictService);

    await expect(
      service.assign('org-1', 'session-1', {
        abstractId: 'abstract-1',
        startTime: '2027-01-01T08:00:00Z',
        endTime: '2027-01-01T10:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an abstract already scheduled in another session at an overlapping time', async () => {
    const conflictService = fakeConflictService({
      assertNoAbstractDoubleBooking: jest
        .fn()
        .mockRejectedValue(new ConflictException('overlap')),
    });
    const prisma = fakePrisma({
      programSession: { findFirst: jest.fn().mockResolvedValue(session) },
      abstract: { findFirst: jest.fn().mockResolvedValue(acceptedAbstract) },
    });
    const service = new PresentationsService(prisma, conflictService);

    await expect(
      service.assign('org-1', 'session-1', {
        abstractId: 'abstract-1',
        ...presentationWindow,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates the presentation assignment when every check passes', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'assignment-1' });
    const prisma = fakePrisma({
      programSession: { findFirst: jest.fn().mockResolvedValue(session) },
      abstract: { findFirst: jest.fn().mockResolvedValue(acceptedAbstract) },
      presentationAssignment: { create },
    });
    const service = new PresentationsService(prisma, fakeConflictService());

    await service.assign('org-1', 'session-1', {
      abstractId: 'abstract-1',
      presentationType: 'ORAL',
      sortOrder: 2,
      ...presentationWindow,
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-1',
        abstractId: 'abstract-1',
        presentationType: 'ORAL',
        startTime: new Date(presentationWindow.startTime),
        endTime: new Date(presentationWindow.endTime),
        sortOrder: 2,
      },
    });
  });

  it('translates a unique-constraint collision into a ConflictException', async () => {
    const create = jest.fn().mockRejectedValue({ code: 'P2002' });
    const prisma = fakePrisma({
      programSession: { findFirst: jest.fn().mockResolvedValue(session) },
      abstract: { findFirst: jest.fn().mockResolvedValue(acceptedAbstract) },
      presentationAssignment: { create },
    });
    const service = new PresentationsService(prisma, fakeConflictService());

    await expect(
      service.assign('org-1', 'session-1', {
        abstractId: 'abstract-1',
        ...presentationWindow,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
