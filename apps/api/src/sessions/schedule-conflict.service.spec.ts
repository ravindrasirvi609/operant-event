import { BadRequestException, ConflictException } from '@nestjs/common';
import { ScheduleConflictService } from './schedule-conflict.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    presentationAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    sessionSpeaker: { findMany: jest.fn().mockResolvedValue([]) },
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

const window = {
  startTime: new Date('2027-01-01T10:00:00Z'),
  endTime: new Date('2027-01-01T11:00:00Z'),
};

describe('ScheduleConflictService.assertValidWindow', () => {
  it('throws BadRequestException when endTime is not after startTime', () => {
    const service = new ScheduleConflictService(fakePrisma());

    expect(() =>
      service.assertValidWindow(window.endTime, window.startTime),
    ).toThrow(BadRequestException);
  });

  it('does not throw for a valid window', () => {
    const service = new ScheduleConflictService(fakePrisma());

    expect(() =>
      service.assertValidWindow(window.startTime, window.endTime),
    ).not.toThrow();
  });
});

describe('ScheduleConflictService.assertPresentationWithinSession', () => {
  it('throws BadRequestException when the presentation window exceeds the session window', () => {
    const service = new ScheduleConflictService(fakePrisma());
    const presentation = {
      startTime: new Date('2027-01-01T09:00:00Z'),
      endTime: new Date('2027-01-01T10:30:00Z'),
    };

    expect(() =>
      service.assertPresentationWithinSession(window, presentation),
    ).toThrow(BadRequestException);
  });

  it('does not throw when the presentation window is inside the session window', () => {
    const service = new ScheduleConflictService(fakePrisma());
    const presentation = {
      startTime: new Date('2027-01-01T10:15:00Z'),
      endTime: new Date('2027-01-01T10:45:00Z'),
    };

    expect(() =>
      service.assertPresentationWithinSession(window, presentation),
    ).not.toThrow();
  });
});

describe('ScheduleConflictService.assertNoAbstractDoubleBooking', () => {
  it('throws ConflictException when the abstract has an overlapping assignment in another session', async () => {
    const prisma = fakePrisma({
      presentationAssignment: {
        findMany: jest.fn().mockResolvedValue([
          {
            startTime: new Date('2027-01-01T10:30:00Z'),
            endTime: new Date('2027-01-01T11:30:00Z'),
          },
        ]),
      },
    });
    const service = new ScheduleConflictService(prisma);

    await expect(
      service.assertNoAbstractDoubleBooking('abstract-1', 'session-1', window),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not throw when the abstract has no overlapping assignment elsewhere', async () => {
    const prisma = fakePrisma({
      presentationAssignment: {
        findMany: jest.fn().mockResolvedValue([
          {
            startTime: new Date('2027-01-01T14:00:00Z'),
            endTime: new Date('2027-01-01T15:00:00Z'),
          },
        ]),
      },
    });
    const service = new ScheduleConflictService(prisma);

    await expect(
      service.assertNoAbstractDoubleBooking('abstract-1', 'session-1', window),
    ).resolves.toBeUndefined();
  });

  it('excludes the current session from the overlap check', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({ presentationAssignment: { findMany } });
    const service = new ScheduleConflictService(prisma);

    await service.assertNoAbstractDoubleBooking(
      'abstract-1',
      'session-1',
      window,
    );

    expect(findMany).toHaveBeenCalledWith({
      where: { abstractId: 'abstract-1', sessionId: { not: 'session-1' } },
      select: { startTime: true, endTime: true },
    });
  });
});

describe('ScheduleConflictService.assertNoSpeakerOverlap', () => {
  it('throws ConflictException when the speaker has an overlapping session assignment elsewhere', async () => {
    const prisma = fakePrisma({
      sessionSpeaker: {
        findMany: jest.fn().mockResolvedValue([
          {
            session: {
              startTime: new Date('2027-01-01T10:30:00Z'),
              endTime: new Date('2027-01-01T11:30:00Z'),
            },
          },
        ]),
      },
    });
    const service = new ScheduleConflictService(prisma);

    await expect(
      service.assertNoSpeakerOverlap('speaker-1', 'session-1', window),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not throw when the speaker has no overlapping session elsewhere', async () => {
    const prisma = fakePrisma({
      sessionSpeaker: {
        findMany: jest.fn().mockResolvedValue([
          {
            session: {
              startTime: new Date('2027-01-01T14:00:00Z'),
              endTime: new Date('2027-01-01T15:00:00Z'),
            },
          },
        ]),
      },
    });
    const service = new ScheduleConflictService(prisma);

    await expect(
      service.assertNoSpeakerOverlap('speaker-1', 'session-1', window),
    ).resolves.toBeUndefined();
  });
});
