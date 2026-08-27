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
import type { UpdatePresentationDto } from './dto/update-presentation.dto';

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

  async findAllForSession(organizationId: string, sessionId: string) {
    const session = await this.prisma.programSession.findFirst({
      where: { id: sessionId, conference: { organizationId } },
    });
    if (!session) {
      throw new NotFoundException('Session not found.');
    }
    return this.prisma.presentationAssignment.findMany({
      where: { sessionId },
      include: { abstract: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async update(
    organizationId: string,
    presentationId: string,
    dto: UpdatePresentationDto,
  ) {
    const presentation = await this.assertPresentationInOrganization(
      organizationId,
      presentationId,
    );

    const startTime = dto.startTime
      ? new Date(dto.startTime)
      : presentation.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : presentation.endTime;
    this.scheduleConflictService.assertPresentationWithinSession(
      presentation.session,
      { startTime, endTime },
    );
    await this.scheduleConflictService.assertNoAbstractDoubleBooking(
      presentation.abstractId,
      presentation.sessionId,
      { startTime, endTime },
    );

    return this.prisma.presentationAssignment.update({
      where: { id: presentationId },
      data: {
        ...(dto.presentationType !== undefined && {
          presentationType: dto.presentationType,
        }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        startTime,
        endTime,
      },
    });
  }

  async remove(organizationId: string, presentationId: string) {
    await this.assertPresentationInOrganization(organizationId, presentationId);
    await this.prisma.presentationAssignment.delete({
      where: { id: presentationId },
    });
  }

  private async assertPresentationInOrganization(
    organizationId: string,
    presentationId: string,
  ) {
    const presentation = await this.prisma.presentationAssignment.findFirst({
      where: {
        id: presentationId,
        session: { conference: { organizationId } },
      },
      include: { session: true },
    });
    if (!presentation) {
      throw new NotFoundException('Presentation not found.');
    }
    return presentation;
  }
}
