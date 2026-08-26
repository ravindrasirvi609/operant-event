import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ScheduleConflictService } from './schedule-conflict.service';
import type { CreateSessionDto } from './dto/create-session.dto';
import type { UpdateSessionDto } from './dto/update-session.dto';
import type { SpeakerAssignmentDto } from './dto/assign-speakers.dto';

const PROGRAM_INCLUDE = {
  track: true,
  speakers: { include: { speaker: true } },
  presentations: true,
} as const;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleConflictService: ScheduleConflictService,
  ) {}

  async create(
    organizationId: string,
    conferenceId: string,
    dto: CreateSessionDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    this.scheduleConflictService.assertValidWindow(startTime, endTime);

    return this.prisma.programSession.create({
      data: {
        conferenceId,
        trackId: dto.trackId,
        title: dto.title,
        description: dto.description,
        room: dto.room,
        sessionDate: new Date(dto.sessionDate),
        startTime,
        endTime,
        sessionType: dto.sessionType,
        status: 'DRAFT',
      },
    });
  }

  async update(
    organizationId: string,
    sessionId: string,
    dto: UpdateSessionDto,
  ) {
    const session = await this.assertSessionInOrganization(
      organizationId,
      sessionId,
    );

    const startTime = dto.startTime
      ? new Date(dto.startTime)
      : session.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : session.endTime;
    this.scheduleConflictService.assertValidWindow(startTime, endTime);

    const updated = await this.prisma.programSession.update({
      where: { id: sessionId },
      data: {
        ...(dto.trackId !== undefined && { trackId: dto.trackId }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.room !== undefined && { room: dto.room }),
        ...(dto.sessionDate !== undefined && {
          sessionDate: new Date(dto.sessionDate),
        }),
        ...(dto.sessionType !== undefined && { sessionType: dto.sessionType }),
        startTime,
        endTime,
      },
    });

    // §15.1: editing an already-PUBLISHED session doesn't silently mutate
    // what's already public — it bumps a version marker instead, so any
    // consumer caching the public schedule knows to refetch.
    if (session.status === 'PUBLISHED') {
      await this.prisma.conference.update({
        where: { id: session.conferenceId },
        data: { scheduleVersion: { increment: 1 } },
      });
    }

    return updated;
  }

  async publish(organizationId: string, sessionId: string) {
    await this.assertSessionInOrganization(organizationId, sessionId);
    return this.prisma.programSession.update({
      where: { id: sessionId },
      data: { status: 'PUBLISHED' },
    });
  }

  async assignSpeakers(
    organizationId: string,
    sessionId: string,
    assignments: SpeakerAssignmentDto[],
  ) {
    const session = await this.assertSessionInOrganization(
      organizationId,
      sessionId,
    );

    const settings = await this.prisma.conferenceSetting.findUnique({
      where: { conferenceId: session.conferenceId },
    });
    if (settings?.preventSpeakerOverlap) {
      for (const assignment of assignments) {
        await this.scheduleConflictService.assertNoSpeakerOverlap(
          assignment.speakerId,
          sessionId,
          {
            startTime: session.startTime,
            endTime: session.endTime,
          },
        );
      }
    }

    const chair = assignments.find((assignment) => assignment.role === 'CHAIR');
    const coChair = assignments.find(
      (assignment) => assignment.role === 'CO_CHAIR',
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.sessionSpeaker.deleteMany({ where: { sessionId } });
      await tx.sessionSpeaker.createMany({
        data: assignments.map((assignment) => ({
          sessionId,
          speakerId: assignment.speakerId,
          role: assignment.role,
        })),
      });
      return tx.programSession.update({
        where: { id: sessionId },
        data: {
          chairId: chair?.speakerId ?? null,
          coChairId: coChair?.speakerId ?? null,
        },
      });
    });
  }

  findAllPublished(conferenceId: string) {
    return this.prisma.programSession.findMany({
      where: { conferenceId, status: 'PUBLISHED' },
      orderBy: { startTime: 'asc' },
      include: PROGRAM_INCLUDE,
    });
  }

  async findAllForOrganizer(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.programSession.findMany({
      where: { conferenceId },
      orderBy: { startTime: 'asc' },
      include: PROGRAM_INCLUDE,
    });
  }

  private async assertConferenceInOrganization(
    organizationId: string,
    conferenceId: string,
  ): Promise<void> {
    const conference = await this.prisma.conference.findFirst({
      where: { id: conferenceId, organizationId },
    });
    if (!conference) {
      throw new NotFoundException('Conference not found.');
    }
  }

  private async assertSessionInOrganization(
    organizationId: string,
    sessionId: string,
  ) {
    const session = await this.prisma.programSession.findFirst({
      where: { id: sessionId, conference: { organizationId } },
    });
    if (!session) {
      throw new NotFoundException('Session not found.');
    }
    return session;
  }
}
