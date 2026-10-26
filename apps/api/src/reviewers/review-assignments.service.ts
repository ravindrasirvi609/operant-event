import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '../common/prisma/prisma.service';

import { ConflictOfInterestService } from './conflict-of-interest.service';

import { NOTIFICATION_EVENTS } from '../notifications/notification.events';

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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async assign(
    organizationId: string,
    conferenceId: string,
    abstractId: string,
    reviewerId: string,
    dueDate?: Date,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    const abstract = await this.prisma.abstract.findFirst({
      where: {
        id: abstractId,
        conferenceId,
      },
    });

    if (!abstract) {
      throw new NotFoundException(
        'Abstract not found.',
      );
    }

    const conflict =
      await this.conflictOfInterest.check(
        reviewerId,
        abstractId,
      );

    if (conflict.hasConflict) {
      throw new ConflictException(
        `Cannot assign this reviewer: ${conflict.reasons.join(' ')}`,
      );
    }

    const assignment =
      await this.prisma.reviewAssignment.create({
        data: {
          conferenceId,
          abstractId,
          reviewerId,
          dueDate,
          status: 'PENDING',
          conflictOfInterest: false,
        },
      });

    await this.emitReviewAssigned(
      organizationId,
      conferenceId,
      reviewerId,
      abstract.title,
      assignment.id,
    );

    return assignment;
  }

  /**
   * Automatically distributes eligible abstracts as evenly as possible
   * across active reviewers.
   *
   * Existing assignments are preserved.
   * Reviewers with conflicts of interest are skipped.
   */
  async autoAssign(
    organizationId: string,
    conferenceId: string,
    reviewersPerAbstract: number = 1,
    dueDate?: Date,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    if (
      !Number.isInteger(reviewersPerAbstract) ||
      reviewersPerAbstract < 1 ||
      reviewersPerAbstract > 3
    ) {
      throw new ConflictException(
        'Reviewers per abstract must be between 1 and 3.',
      );
    }

    /*
     * Only active reviewers belonging to the current organization
     * participate in auto-assignment.
     */
    const reviewers =
      await this.prisma.reviewer.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

    if (reviewers.length === 0) {
      throw new NotFoundException(
        'No active reviewers are available for this organization.',
      );
    }

    /*
     * Do not auto-assign drafts or withdrawn abstracts.
     *
     * Other existing submission/review statuses remain eligible,
     * while existing assignments prevent duplicate assignment.
     */
    const abstracts =
      await this.prisma.abstract.findMany({
        where: {
          conferenceId,
          status: {
            notIn: [
              'DRAFT',
              'WITHDRAWN',
            ],
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

    if (abstracts.length === 0) {
      return {
        assigned: 0,
        skipped: 0,
        reviewersAvailable: reviewers.length,
        abstractsProcessed: 0,
        message:
          'No eligible abstracts found for review assignment.',
      };
    }

    /*
     * Load existing assignments once.
     *
     * This allows auto-assignment to:
     * - avoid duplicates
     * - preserve existing assignments
     * - calculate reviewer workload
     */
    const existingAssignments =
      await this.prisma.reviewAssignment.findMany({
        where: {
          conferenceId,
          status: {
            notIn: [
              'CANCELLED',
              'DECLINED',
            ],
          },
        },
        select: {
          abstractId: true,
          reviewerId: true,
        },
      });

    /*
     * Pair key:
     *
     * abstractId:reviewerId
     */
    const existingPairs = new Set(
      existingAssignments.map(
        (assignment) =>
          `${assignment.abstractId}:${assignment.reviewerId}`,
      ),
    );

    /*
     * Reviewer workload.
     *
     * Lower load = higher priority for the next assignment.
     */
    const reviewerLoad =
      new Map<string, number>();

    for (const reviewer of reviewers) {
      reviewerLoad.set(
        reviewer.id,
        0,
      );
    }

    for (const assignment of existingAssignments) {
      const currentLoad =
        reviewerLoad.get(
          assignment.reviewerId,
        ) ?? 0;

      reviewerLoad.set(
        assignment.reviewerId,
        currentLoad + 1,
      );
    }

    let assigned = 0;
    let skipped = 0;

    for (const abstract of abstracts) {
      /*
       * Find reviewers already assigned to this abstract.
       */
      const currentAssignments =
        existingAssignments.filter(
          (assignment) =>
            assignment.abstractId ===
            abstract.id,
        );

      const currentReviewerIds =
        new Set(
          currentAssignments.map(
            (assignment) =>
              assignment.reviewerId,
          ),
        );

      /*
       * If the abstract already has enough reviewers,
       * do nothing.
       */
      const remainingSlots =
        reviewersPerAbstract -
        currentReviewerIds.size;

      if (remainingSlots <= 0) {
        skipped += 1;
        continue;
      }

      /*
       * Find eligible reviewers.
       */
      const candidates: Array<{
        reviewerId: string;
        load: number;
      }> = [];

      for (const reviewer of reviewers) {
        /*
         * Don't assign the same reviewer twice to the
         * same abstract.
         */
        if (
          currentReviewerIds.has(
            reviewer.id,
          )
        ) {
          continue;
        }

        const pairKey =
          `${abstract.id}:${reviewer.id}`;

        if (existingPairs.has(pairKey)) {
          continue;
        }

        /*
         * Reuse the same conflict-of-interest
         * service used by manual assignment.
         */
        const conflict =
          await this.conflictOfInterest.check(
            reviewer.id,
            abstract.id,
          );

        if (conflict.hasConflict) {
          continue;
        }

        candidates.push({
          reviewerId: reviewer.id,
          load:
            reviewerLoad.get(
              reviewer.id,
            ) ?? 0,
        });
      }

      /*
       * Lowest workload first.
       *
       * If two reviewers have the same workload,
       * use reviewer ID as deterministic tie-breaker.
       */
      candidates.sort((a, b) => {
        if (a.load !== b.load) {
          return a.load - b.load;
        }

        return a.reviewerId.localeCompare(
          b.reviewerId,
        );
      });

      const selectedReviewers =
        candidates.slice(
          0,
          remainingSlots,
        );

      /*
       * No reviewer available because of conflicts
       * or capacity.
       */
      if (
        selectedReviewers.length === 0
      ) {
        skipped += 1;
        continue;
      }

      for (const candidate of selectedReviewers) {
        const assignment =
          await this.prisma.reviewAssignment.create({
            data: {
              conferenceId,
              abstractId: abstract.id,
              reviewerId:
                candidate.reviewerId,
              dueDate,
              status: 'PENDING',
              conflictOfInterest: false,
            },
          });

        /*
         * Keep local state updated so later abstracts
         * see the new workload and assignment.
         */
        existingPairs.add(
          `${abstract.id}:${candidate.reviewerId}`,
        );

        reviewerLoad.set(
          candidate.reviewerId,
          (reviewerLoad.get(
            candidate.reviewerId,
          ) ?? 0) + 1,
        );

        assigned += 1;

        /*
         * Same notification event as manual assignment.
         */
        await this.emitReviewAssigned(
          organizationId,
          conferenceId,
          candidate.reviewerId,
          abstract.title,
          assignment.id,
        );
      }
    }

    return {
      assigned,
      skipped,
      reviewersAvailable:
        reviewers.length,
      abstractsProcessed:
        abstracts.length,
    };
  }

  /**
   * Cancels the old assignment and creates a fresh one,
   * keeping a pointer back for audit history (REV-002).
   */
  async reassign(
    organizationId: string,
    assignmentId: string,
    newReviewerId: string,
    dueDate?: Date,
  ) {
    const oldAssignment =
      await this.prisma.reviewAssignment.findFirst({
        where: {
          id: assignmentId,
        },
      });

    if (!oldAssignment) {
      throw new NotFoundException(
        'Review assignment not found.',
      );
    }

    await this.assertConferenceInOrganization(
      organizationId,
      oldAssignment.conferenceId,
    );

    const conflict =
      await this.conflictOfInterest.check(
        newReviewerId,
        oldAssignment.abstractId,
      );

    if (conflict.hasConflict) {
      throw new ConflictException(
        `Cannot assign this reviewer: ${conflict.reasons.join(' ')}`,
      );
    }

    await this.prisma.reviewAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        status: 'CANCELLED',
      },
    });

    const newAssignment =
      await this.prisma.reviewAssignment.create({
        data: {
          conferenceId:
            oldAssignment.conferenceId,
          abstractId:
            oldAssignment.abstractId,
          reviewerId: newReviewerId,
          dueDate,
          status: 'PENDING',
          conflictOfInterest: false,
          reassignedFromId: assignmentId,
        },
      });

    const abstract =
      await this.prisma.abstract.findUnique({
        where: {
          id: oldAssignment.abstractId,
        },
        select: {
          title: true,
        },
      });

    if (abstract) {
      await this.emitReviewAssigned(
        organizationId,
        oldAssignment.conferenceId,
        newReviewerId,
        abstract.title,
        newAssignment.id,
      );
    }

    return newAssignment;
  }

  /**
   * §20 trigger: "Review assigned".
   *
   * No-ops silently if the reviewer has since been removed.
   */
  private async emitReviewAssigned(
    organizationId: string,
    conferenceId: string,
    reviewerId: string,
    abstractTitle: string,
    assignmentId: string,
  ): Promise<void> {
    const reviewer =
      await this.prisma.reviewer.findUnique({
        where: {
          id: reviewerId,
        },
        select: {
          userId: true,
        },
      });

    if (!reviewer) {
      return;
    }

    this.eventEmitter.emit(
      NOTIFICATION_EVENTS.REVIEW_ASSIGNED,
      {
        organizationId,
        conferenceId,
        userId: reviewer.userId,
        templateData: {
          abstractTitle,
        },
        entityType: 'reviewAssignment',
        entityId: assignmentId,
      },
    );
  }

  async decline(
    reviewerId: string,
    assignmentId: string,
  ): Promise<void> {
    const result =
      await this.prisma.reviewAssignment.updateMany({
        where: {
          id: assignmentId,
          reviewerId,
        },
        data: {
          status: 'DECLINED',
        },
      });

    if (result.count === 0) {
      throw new ForbiddenException(
        'This assignment does not belong to you.',
      );
    }
  }

  async declareConflict(
    reviewerId: string,
    assignmentId: string,
  ): Promise<void> {
    const result =
      await this.prisma.reviewAssignment.updateMany({
        where: {
          id: assignmentId,
          reviewerId,
        },
        data: {
          status: 'CANCELLED',
          conflictOfInterest: true,
        },
      });

    if (result.count === 0) {
      throw new ForbiddenException(
        'This assignment does not belong to you.',
      );
    }
  }

  /**
   * REV-004:
   *
   * The query never selects Author/AbstractAuthor.
   *
   * For OPEN review mode, submittedBy is exposed.
   * Otherwise even submittedBy is removed.
   */
  async findMine(
    reviewerId: string,
  ): Promise<ReviewAssignmentProjection[]> {
    const assignments =
      await this.prisma.reviewAssignment.findMany({
        where: {
          reviewerId,
        },
        include: {
          review: true,
          abstract: {
            include: {
              conference: {
                include: {
                  settings: true,
                },
              },
            },
          },
        },
      });

    return assignments.map(
      (assignment) =>
        this.toProjection(assignment),
    );
  }

  /**
   * A User can be a Reviewer in more than one organization.
   *
   * Reviewer-facing "mine" therefore means all reviewer rows
   * belonging to the current user.
   */
  async findMineByUserId(
    userId: string,
  ): Promise<ReviewAssignmentProjection[]> {
    const reviewers =
      await this.prisma.reviewer.findMany({
        where: {
          userId,
        },
        select: {
          id: true,
        },
      });

    if (reviewers.length === 0) {
      return [];
    }

    const assignments =
      await this.prisma.reviewAssignment.findMany({
        where: {
          reviewerId: {
            in: reviewers.map(
              (reviewer) =>
                reviewer.id,
            ),
          },
        },
        include: {
          review: true,
          abstract: {
            include: {
              conference: {
                include: {
                  settings: true,
                },
              },
            },
          },
        },
      });

    return assignments.map(
      (assignment) =>
        this.toProjection(assignment),
    );
  }

  async declineByUserId(
    userId: string,
    assignmentId: string,
  ): Promise<void> {
    const result =
      await this.prisma.reviewAssignment.updateMany({
        where: {
          id: assignmentId,
          reviewer: {
            userId,
          },
        },
        data: {
          status: 'DECLINED',
        },
      });

    if (result.count === 0) {
      throw new ForbiddenException(
        'This assignment does not belong to you.',
      );
    }
  }

  async declareConflictByUserId(
    userId: string,
    assignmentId: string,
  ): Promise<void> {
    const result =
      await this.prisma.reviewAssignment.updateMany({
        where: {
          id: assignmentId,
          reviewer: {
            userId,
          },
        },
        data: {
          status: 'CANCELLED',
          conflictOfInterest: true,
        },
      });

    if (result.count === 0) {
      throw new ForbiddenException(
        'This assignment does not belong to you.',
      );
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
      conference: {
        settings: {
          reviewMode: string;
        } | null;
      };
    };
  }): ReviewAssignmentProjection {
    const isOpenReview =
      assignment.abstract.conference.settings
        ?.reviewMode === 'OPEN';

    const abstract: ReviewerAbstractProjection =
      {
        id: assignment.abstract.id,
        title: assignment.abstract.title,
        submissionType:
          assignment.abstract
            .submissionType,
        status:
          assignment.abstract.status,

        ...(isOpenReview && {
          submittedBy:
            assignment.abstract
              .submittedBy,
        }),
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
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    const [
      assigned,
      completed,
      overdue,
    ] = await Promise.all([
      this.prisma.reviewAssignment.count({
        where: {
          conferenceId,
        },
      }),

      this.prisma.reviewAssignment.count({
        where: {
          conferenceId,
          status: 'COMPLETED',
        },
      }),

      this.prisma.reviewAssignment.count({
        where: {
          conferenceId,
          status: 'OVERDUE',
        },
      }),
    ]);

    return {
      assigned,
      completed,
      overdue,
    };
  }

  /**
   * Organizer-facing:
   * every assignment for the abstract with its
   * submitted review, if any.
   */
  async findReviewsForAbstract(
    organizationId: string,
    conferenceId: string,
    abstractId: string,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

const assignments =
  await this.prisma.reviewAssignment.findMany({
    where: {
      conferenceId,
      abstractId,
    },
    include: {
      review: true,
      reviewer: true,
    },
  });

const userIds = assignments
  .map((assignment) => assignment.reviewer.userId)
  .filter(Boolean);

const users = await this.prisma.user.findMany({
  where: {
    id: {
      in: userIds,
    },
  },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
  },
});

const usersById = new Map(
  users.map((user) => [user.id, user]),
);

return assignments.map((assignment) => ({
  ...assignment,
  reviewer: {
    ...assignment.reviewer,
    user:
      usersById.get(
        assignment.reviewer.userId,
      ) ?? null,
  },
}));
  }

  /**
   * Preview conflict check.
   */
  checkConflict(
    reviewerId: string,
    abstractId: string,
  ) {
    return this.conflictOfInterest.check(
      reviewerId,
      abstractId,
    );
  }

  /**
   * REV-007:
   *
   * Moves PENDING/IN_PROGRESS assignments to OVERDUE
   * when their due date has passed.
   */
  async markOverdue(): Promise<{
    count: number;
  }> {
    return this.prisma.reviewAssignment.updateMany({
      where: {
        status: {
          in: [
            'PENDING',
            'IN_PROGRESS',
          ],
        },
        dueDate: {
          lt: new Date(),
        },
      },
      data: {
        status: 'OVERDUE',
      },
    });
  }

  private async assertConferenceInOrganization(
    organizationId: string,
    conferenceId: string,
  ): Promise<void> {
    const conference =
      await this.prisma.conference.findFirst({
        where: {
          id: conferenceId,
          organizationId,
        },
      });

    if (!conference) {
      throw new NotFoundException(
        'Conference not found.',
      );
    }
  }
}