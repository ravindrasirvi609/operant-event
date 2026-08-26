import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  isWithinWindow,
  windowsOverlap,
  type TimeWindow,
} from './schedule-conflict.util';

@Injectable()
export class ScheduleConflictService {
  constructor(private readonly prisma: PrismaService) {}

  assertValidWindow(startTime: Date, endTime: Date): void {
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime.');
    }
  }

  assertPresentationWithinSession(
    session: TimeWindow,
    presentation: TimeWindow,
  ): void {
    if (!isWithinWindow(presentation, session)) {
      throw new BadRequestException(
        "Presentation time must fall within the session's time window.",
      );
    }
  }

  /** SRS §15.1: the unique abstract cannot be double-booked into two sessions with overlapping times. */
  async assertNoAbstractDoubleBooking(
    abstractId: string,
    excludeSessionId: string,
    window: TimeWindow,
  ): Promise<void> {
    const others = await this.prisma.presentationAssignment.findMany({
      where: { abstractId, sessionId: { not: excludeSessionId } },
      select: { startTime: true, endTime: true },
    });
    const conflict = others.some((other) => windowsOverlap(other, window));
    if (conflict) {
      throw new ConflictException(
        'This abstract is already scheduled in another session at an overlapping time.',
      );
    }
  }

  /** Only called when ConferenceSetting.preventSpeakerOverlap is enabled. */
  async assertNoSpeakerOverlap(
    speakerId: string,
    excludeSessionId: string,
    window: TimeWindow,
  ): Promise<void> {
    const otherAssignments = await this.prisma.sessionSpeaker.findMany({
      where: { speakerId, sessionId: { not: excludeSessionId } },
      select: { session: { select: { startTime: true, endTime: true } } },
    });
    const conflict = otherAssignments.some((assignment) =>
      windowsOverlap(assignment.session, window),
    );
    if (conflict) {
      throw new ConflictException(
        'This speaker is already assigned to another session at an overlapping time.',
      );
    }
  }
}
