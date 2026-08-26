import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { NOTIFICATION_EVENTS } from '../notifications/notification.events';
import type { RecordDecisionDto } from './dto/record-decision.dto';
import type { RequestRevisionDto } from './dto/request-revision.dto';

@Injectable()
export class DecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Always a human action taken verbatim — never derived from any Review's
   * recommendation, even when every reviewer agrees. §12: "Final decisions
   * must remain separate from individual reviewer recommendations."
   */
  async recordDecision(
    organizationId: string,
    abstractId: string,
    decidedBy: string,
    dto: RecordDecisionDto,
  ) {
    const abstract = await this.assertAbstractInOrganization(
      organizationId,
      abstractId,
    );

    const decision = await this.prisma.abstractDecision.create({
      data: {
        abstractId,
        decision: dto.decision,
        reason: dto.reason,
        decidedBy,
        effectiveVersionId: abstract.currentVersionId,
      },
    });

    await this.prisma.abstract.update({
      where: { id: abstractId },
      data: { status: dto.decision },
    });

    if (dto.decision === 'ACCEPTED') {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.ABSTRACT_ACCEPTED, {
        organizationId,
        conferenceId: abstract.conferenceId,
        userId: abstract.submittedBy,
        templateData: { abstractTitle: abstract.title },
      });
    }

    return decision;
  }

  async requestRevision(
    organizationId: string,
    abstractId: string,
    requestedBy: string,
    dto: RequestRevisionDto,
  ) {
    const abstract = await this.assertAbstractInOrganization(
      organizationId,
      abstractId,
    );

    const revisionRequest = await this.prisma.abstractRevisionRequest.create({
      data: {
        abstractId,
        requestedBy,
        reason: dto.reason,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });

    await this.prisma.abstract.update({
      where: { id: abstractId },
      data: { status: 'REVISION_REQUIRED' },
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.ABSTRACT_REVISION_REQUIRED, {
      organizationId,
      conferenceId: abstract.conferenceId,
      userId: abstract.submittedBy,
      templateData: { abstractTitle: abstract.title, reason: dto.reason },
    });

    return revisionRequest;
  }

  private async assertAbstractInOrganization(
    organizationId: string,
    abstractId: string,
  ) {
    const abstract = await this.prisma.abstract.findFirst({
      where: { id: abstractId, conference: { organizationId } },
    });
    if (!abstract) {
      throw new NotFoundException('Abstract not found.');
    }
    return abstract;
  }
}
