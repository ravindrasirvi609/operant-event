import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { NOTIFICATION_EVENTS } from './notification.events';

const REVIEW_DUE_THRESHOLD_HOURS = 48;
const CONFERENCE_REMINDER_THRESHOLD_HOURS = 48;

/**
 * §20 REVIEW_DUE/CONFERENCE_REMINDER: the only two trigger-table events with
 * no natural single call site — everything else fires as a direct side
 * effect of a user action. Idempotency is checked against existing
 * Notification rows for the same entityType/entityId (Task group G) rather
 * than a separate marker table — a @Cron job only fires while this apps/api
 * process is continuously running, so this is a standard NestJS in-process
 * scheduler, not a separate scheduler process.
 */
@Injectable()
export class RemindersScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleReviewDueCron(): Promise<number> {
    return this.emitReviewDueReminders();
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  handleConferenceReminderCron(): Promise<number> {
    return this.emitConferenceReminders();
  }

  async emitReviewDueReminders(): Promise<number> {
    const now = new Date();
    const threshold = new Date(
      now.getTime() + REVIEW_DUE_THRESHOLD_HOURS * 60 * 60 * 1000,
    );
    const assignments = await this.prisma.reviewAssignment.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { gte: now, lte: threshold },
      },
      include: { abstract: true, reviewer: true },
    });

    let emitted = 0;
    for (const assignment of assignments) {
      const alreadyNotified = await this.prisma.notification.findFirst({
        where: {
          type: NOTIFICATION_EVENTS.REVIEW_DUE,
          entityType: 'reviewAssignment',
          entityId: assignment.id,
        },
      });
      if (alreadyNotified) {
        continue;
      }

      this.eventEmitter.emit(NOTIFICATION_EVENTS.REVIEW_DUE, {
        organizationId: assignment.reviewer.organizationId,
        conferenceId: assignment.conferenceId,
        userId: assignment.reviewer.userId,
        templateData: {
          abstractTitle: assignment.abstract.title,
          dueDate: assignment.dueDate!.toISOString().slice(0, 10),
        },
        entityType: 'reviewAssignment',
        entityId: assignment.id,
      });
      emitted += 1;
    }
    return emitted;
  }

  async emitConferenceReminders(): Promise<number> {
    const now = new Date();
    const threshold = new Date(
      now.getTime() + CONFERENCE_REMINDER_THRESHOLD_HOURS * 60 * 60 * 1000,
    );
    const conferences = await this.prisma.conference.findMany({
      where: { startDate: { gte: now, lte: threshold } },
    });

    let emitted = 0;
    for (const conference of conferences) {
      const registrations = await this.prisma.registration.findMany({
        where: { conferenceId: conference.id, status: 'CONFIRMED' },
      });
      for (const registration of registrations) {
        const alreadyNotified = await this.prisma.notification.findFirst({
          where: {
            type: NOTIFICATION_EVENTS.CONFERENCE_REMINDER,
            entityType: 'conference',
            entityId: conference.id,
            userId: registration.userId,
          },
        });
        if (alreadyNotified) {
          continue;
        }

        this.eventEmitter.emit(NOTIFICATION_EVENTS.CONFERENCE_REMINDER, {
          organizationId: conference.organizationId,
          conferenceId: conference.id,
          userId: registration.userId,
          templateData: {
            conferenceName: conference.name,
            startDate: conference.startDate.toISOString().slice(0, 10),
          },
          entityType: 'conference',
          entityId: conference.id,
        });
        emitted += 1;
      }
    }
    return emitted;
  }
}
