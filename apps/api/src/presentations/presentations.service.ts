import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ScheduleConflictService } from '../sessions/schedule-conflict.service';
import { isUniqueConstraintViolation } from '../common/utils/prisma-errors.util';
import type { AssignPresentationDto } from './dto/assign-presentation.dto';

@Injectable()
export class PresentationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleConflictService: ScheduleConflictService,
  ) {}

  async assign(
    organizationId: string,
    sessionId: string,
    dto: AssignPresentationDto,
  ) {
    const session = await this.prisma.programSession.findFirst({
      where: { id: sessionId, conference: { organizationId } },
    });
    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    const abstract = await this.prisma.abstract.findFirst({
      where: { id: dto.abstractId, conferenceId: session.conferenceId },
    });
    if (!abstract) {
      throw new NotFoundException('Abstract not found in this conference.');
    }
    if (abstract.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Only an ACCEPTED abstract can be scheduled into a session.',
      );
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    this.scheduleConflictService.assertPresentationWithinSession(session, {
      startTime,
      endTime,
    });
    await this.scheduleConflictService.assertNoAbstractDoubleBooking(
      dto.abstractId,
      sessionId,
      {
        startTime,
        endTime,
      },
    );

    try {
      return await this.prisma.presentationAssignment.create({
        data: {
          sessionId,
          abstractId: dto.abstractId,
          presentationType: dto.presentationType,
          startTime,
          endTime,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(
          'This abstract is already scheduled into this session.',
        );
      }
      throw error;
    }
  }
}
