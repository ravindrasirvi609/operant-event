import type { EventEmitter2 } from '@nestjs/event-emitter';
import { RemindersScheduler } from './reminders.scheduler';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakeEventEmitter(): EventEmitter2 {
  return { emit: jest.fn() } as unknown as EventEmitter2;
}

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    reviewAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    conference: { findMany: jest.fn().mockResolvedValue([]) },
    registration: { findMany: jest.fn().mockResolvedValue([]) },
    notification: { findFirst: jest.fn().mockResolvedValue(null) },
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

const dueAssignment = {
  id: 'assignment-1',
  conferenceId: 'conf-1',
  dueDate: new Date('2027-01-02T00:00:00Z'),
  abstract: { title: 'A Study' },
  reviewer: { userId: 'user-1', organizationId: 'org-1' },
};

describe('RemindersScheduler.emitReviewDueReminders', () => {
  it('emits review.due for a PENDING/IN_PROGRESS assignment due within the threshold, not yet notified today', async () => {
    const eventEmitter = fakeEventEmitter();
    const prisma = fakePrisma({
      reviewAssignment: {
        findMany: jest.fn().mockResolvedValue([dueAssignment]),
      },
    });
    const scheduler = new RemindersScheduler(prisma, eventEmitter);

    const emitted = await scheduler.emitReviewDueReminders();

    expect(eventEmitter.emit).toHaveBeenCalledWith('review.due', {
      organizationId: 'org-1',
      conferenceId: 'conf-1',
      userId: 'user-1',
      templateData: { abstractTitle: 'A Study', dueDate: '2027-01-02' },
      entityType: 'reviewAssignment',
      entityId: 'assignment-1',
    });
    expect(emitted).toBe(1);
  });

  it('skips an assignment already notified (a review.due Notification with the same entityId already exists)', async () => {
    const eventEmitter = fakeEventEmitter();
    const prisma = fakePrisma({
      reviewAssignment: {
        findMany: jest.fn().mockResolvedValue([dueAssignment]),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    });
    const scheduler = new RemindersScheduler(prisma, eventEmitter);

    const emitted = await scheduler.emitReviewDueReminders();

    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(emitted).toBe(0);
  });

  it('queries only PENDING/IN_PROGRESS assignments with a dueDate inside the 48h threshold', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({ reviewAssignment: { findMany } });
    const scheduler = new RemindersScheduler(prisma, fakeEventEmitter());

    await scheduler.emitReviewDueReminders();

    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { gte: expect.any(Date), lte: expect.any(Date) },
      },
      include: { abstract: true, reviewer: true },
    });
  });
});

const upcomingConference = {
  id: 'conf-1',
  organizationId: 'org-1',
  name: 'Operant Summit 2027',
  startDate: new Date('2027-01-02T00:00:00Z'),
};

describe('RemindersScheduler.emitConferenceReminders', () => {
  it('emits conference.reminder for every CONFIRMED registrant of a conference starting within the threshold', async () => {
    const eventEmitter = fakeEventEmitter();
    const prisma = fakePrisma({
      conference: {
        findMany: jest.fn().mockResolvedValue([upcomingConference]),
      },
      registration: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'user-1' }]),
      },
    });
    const scheduler = new RemindersScheduler(prisma, eventEmitter);

    const emitted = await scheduler.emitConferenceReminders();

    expect(eventEmitter.emit).toHaveBeenCalledWith('conference.reminder', {
      organizationId: 'org-1',
      conferenceId: 'conf-1',
      userId: 'user-1',
      templateData: {
        conferenceName: 'Operant Summit 2027',
        startDate: '2027-01-02',
      },
      entityType: 'conference',
      entityId: 'conf-1',
    });
    expect(emitted).toBe(1);
  });

  it('skips a registrant already notified for this conference', async () => {
    const eventEmitter = fakeEventEmitter();
    const prisma = fakePrisma({
      conference: {
        findMany: jest.fn().mockResolvedValue([upcomingConference]),
      },
      registration: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'user-1' }]),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    });
    const scheduler = new RemindersScheduler(prisma, eventEmitter);

    const emitted = await scheduler.emitConferenceReminders();

    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(emitted).toBe(0);
  });

  it('queries only CONFIRMED registrations for the conference', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      conference: {
        findMany: jest.fn().mockResolvedValue([upcomingConference]),
      },
      registration: { findMany },
    });
    const scheduler = new RemindersScheduler(prisma, fakeEventEmitter());

    await scheduler.emitConferenceReminders();

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1', status: 'CONFIRMED' },
    });
  });
});
