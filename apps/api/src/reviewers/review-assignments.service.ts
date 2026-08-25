import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConflictOfInterestService } from './conflict-of-interest.service';

export interface ReviewerAbstractProjection {
  id: string;
  title: string;
  submissionType: string;
  status: string;
  submittedBy?: string;
}

export interface ReviewAssignmentProjection {
  id: string;
  status: string;
  dueDate: Date | null;
  assignedAt: Date;
  abstract: ReviewerAbstractProjection;
  review: unknown;
}

export interface DashboardCounts {
  assigned: number;
  completed: number;
  overdue: number;
}

@Injectable()
export class ReviewAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conflictOfInterest: ConflictOfInterestService,
  ) {}

  async assign(
    organizationId: string,
    conferenceId: string,
    abstractId: string,
    reviewerId: string,
    dueDate?: Date,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    const abstract = await this.prisma.abstract.findFirst({
      where: { id: abstractId, conferenceId },
    });
    if (!abstract) {
      throw new NotFoundException('Abstract not found.');
    }

    const conflict = await this.conflictOfInterest.check(
      reviewerId,
      abstractId,
    );
    if (conflict.hasConflict) {
      throw new ConflictException(
        `Cannot assign this reviewer: ${conflict.reasons.join(' ')}`,
      );
    }

    return this.prisma.reviewAssignment.create({
      data: {
        conferenceId,
        abstractId,
        reviewerId,
        dueDate,
        status: 'PENDING',
        conflictOfInterest: false,
      },
    });
  }

  /** Cancels the old assignment and creates a fresh one, keeping a pointer back for audit history (REV-002). */
  async reassign(
    organizationId: string,
    assignmentId: string,
    newReviewerId: string,
    dueDate?: Date,
  ) {
    const oldAssignment = await this.prisma.reviewAssignment.findFirst({
      where: { id: assignmentId },
    });
    if (!oldAssignment) {
      throw new NotFoundException('Review assignment not found.');
    }
    await this.assertConferenceInOrganization(
      organizationId,
      oldAssignment.conferenceId,
    );

    const conflict = await this.conflictOfInterest.check(
      newReviewerId,
      oldAssignment.abstractId,
    );
    if (conflict.hasConflict) {
      throw new ConflictException(
        `Cannot assign this reviewer: ${conflict.reasons.join(' ')}`,
      );
    }

    await this.prisma.reviewAssignment.update({
      where: { id: assignmentId },
      data: { status: 'CANCELLED' },
    });

    return this.prisma.reviewAssignment.create({
      data: {
        conferenceId: oldAssignment.conferenceId,
        abstractId: oldAssignment.abstractId,
        reviewerId: newReviewerId,
        dueDate,
        status: 'PENDING',
        conflictOfInterest: false,
        reassignedFromId: assignmentId,
      },
    });
  }

  async decline(reviewerId: string, assignmentId: string): Promise<void> {
    const result = await this.prisma.reviewAssignment.updateMany({
      where: { id: assignmentId, reviewerId },
      data: { status: 'DECLINED' },
    });
    if (result.count === 0) {
      throw new ForbiddenException('This assignment does not belong to you.');
    }
  }

  async declareConflict(
    reviewerId: string,
    assignmentId: string,
  ): Promise<void> {
    const result = await this.prisma.reviewAssignment.updateMany({
      where: { id: assignmentId, reviewerId },
      data: { status: 'CANCELLED', conflictOfInterest: true },
    });
    if (result.count === 0) {
      throw new ForbiddenException('This assignment does not belong to you.');
    }
  }

  /**
   * REV-004: the query never selects Author/AbstractAuthor at all, blind or
   * not — the projection additionally strips submittedBy (a User id) unless
   * the conference is in OPEN review mode, since even that alone can be
   * used to look up an author's identity.
   */
  async findMine(reviewerId: string): Promise<ReviewAssignmentProjection[]> {
    const assignments = await this.prisma.reviewAssignment.findMany({
      where: { reviewerId },
      include: {
        review: true,
        abstract: {
          include: { conference: { include: { settings: true } } },
        },
      },
    });

    return assignments.map((assignment) => this.toProjection(assignment));
  }

  /**
   * A User can be a Reviewer in more than one organization (one Reviewer
   * row per org, per the schema's @@unique([organizationId, userId])), and
   * a reviewer-facing request carries no organization context — so "mine"
   * means "across every Reviewer row this user has", not a single one.
   */
  async findMineByUserId(
    userId: string,
  ): Promise<ReviewAssignmentProjection[]> {
    const reviewers = await this.prisma.reviewer.findMany({
      where: { userId },
      select: { id: true },
    });
    if (reviewers.length === 0) {
      return [];
    }

    const assignments = await this.prisma.reviewAssignment.findMany({
      where: { reviewerId: { in: reviewers.map((reviewer) => reviewer.id) } },
      include: {
        review: true,
        abstract: {
          include: { conference: { include: { settings: true } } },
        },
      },
    });

    return assignments.map((assignment) => this.toProjection(assignment));
  }

  async declineByUserId(userId: string, assignmentId: string): Promise<void> {
    const result = await this.prisma.reviewAssignment.updateMany({
      where: { id: assignmentId, reviewer: { userId } },
      data: { status: 'DECLINED' },
    });
    if (result.count === 0) {
      throw new ForbiddenException('This assignment does not belong to you.');
    }
  }

  async declareConflictByUserId(
    userId: string,
    assignmentId: string,
  ): Promise<void> {
    const result = await this.prisma.reviewAssignment.updateMany({
      where: { id: assignmentId, reviewer: { userId } },
      data: { status: 'CANCELLED', conflictOfInterest: true },
    });
    if (result.count === 0) {
      throw new ForbiddenException('This assignment does not belong to you.');
    }
  }

  private toProjection(assignment: {
    id: string;
    status: string;
    dueDate: Date | null;
    assignedAt: Date;
    review: unknown;
    abstract: {
      id: string;
      title: string;
      submissionType: string;
      status: string;
      submittedBy: string;
      conference: { settings: { reviewMode: string } | null };
    };
  }): ReviewAssignmentProjection {
    const isOpenReview =
      assignment.abstract.conference.settings?.reviewMode === 'OPEN';
    const abstract: ReviewerAbstractProjection = {
      id: assignment.abstract.id,
      title: assignment.abstract.title,
      submissionType: assignment.abstract.submissionType,
      status: assignment.abstract.status,
      ...(isOpenReview && { submittedBy: assignment.abstract.submittedBy }),
    };
    return {
      id: assignment.id,
      status: assignment.status,
      dueDate: assignment.dueDate,
      assignedAt: assignment.assignedAt,
      abstract,
      review: assignment.review,
    };
  }

  async dashboard(
    organizationId: string,
    conferenceId: string,
  ): Promise<DashboardCounts> {
    await this.assertConferenceInOrganization(organizationId, conferenceId);

    const [assigned, completed, overdue] = await Promise.all([
      this.prisma.reviewAssignment.count({ where: { conferenceId } }),
      this.prisma.reviewAssignment.count({
        where: { conferenceId, status: 'COMPLETED' },
      }),
      this.prisma.reviewAssignment.count({
        where: { conferenceId, status: 'OVERDUE' },
      }),
    ]);

    return { assigned, completed, overdue };
  }

  /**
   * REV-007's job logic. Not yet wired to a scheduler (apps/worker has no
   * BullMQ repeatable-job infra set up) — callable on demand for now;
   * idempotent either way, since it only ever moves PENDING/IN_PROGRESS
   * rows forward.
   */
  async markOverdue(): Promise<{ count: number }> {
    return this.prisma.reviewAssignment.updateMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
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
}
