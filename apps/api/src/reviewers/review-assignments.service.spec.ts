import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewAssignmentsService } from './review-assignments.service';
import { ConflictOfInterestService } from './conflict-of-interest.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn() },
    abstract: { findFirst: jest.fn() },
    reviewer: { findMany: jest.fn() },
    reviewAssignment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
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

function buildService(
  prisma: PrismaService,
  coiResult: { hasConflict: boolean; reasons: string[] } = {
    hasConflict: false,
    reasons: [],
  },
) {
  const coi = {
    check: jest.fn().mockResolvedValue(coiResult),
  } as unknown as ConflictOfInterestService;
  return new ReviewAssignmentsService(prisma, coi);
}

const conferenceInOrg = { id: 'conf-1', organizationId: 'org-1' };
const abstractInConference = { id: 'abs-1', conferenceId: 'conf-1' };

describe('ReviewAssignmentsService.assign', () => {
  it('rejects assignment outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      buildService(prisma).assign('org-1', 'conf-x', 'abs-1', 'reviewer-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to create a conflicted assignment', async () => {
    const create = jest.fn();
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(conferenceInOrg) },
      abstract: {
        findFirst: jest.fn().mockResolvedValue(abstractInConference),
      },
      reviewAssignment: { create },
    });

    await expect(
      buildService(prisma, {
        hasConflict: true,
        reasons: ['Reviewer is a co-author on this abstract.'],
      }).assign('org-1', 'conf-1', 'abs-1', 'reviewer-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a PENDING assignment when there is no conflict', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'assignment-1', status: 'PENDING' });
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(conferenceInOrg) },
      abstract: {
        findFirst: jest.fn().mockResolvedValue(abstractInConference),
      },
      reviewAssignment: { create },
    });

    await buildService(prisma).assign('org-1', 'conf-1', 'abs-1', 'reviewer-1');

    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        abstractId: 'abs-1',
        reviewerId: 'reviewer-1',
        dueDate: undefined,
        status: 'PENDING',
        conflictOfInterest: false,
      },
    });
  });
});

describe('ReviewAssignmentsService.reassign', () => {
  it('cancels the old assignment and creates a new one referencing it', async () => {
    const oldAssignment = {
      id: 'assignment-1',
      conferenceId: 'conf-1',
      abstractId: 'abs-1',
    };
    const update = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue({ id: 'assignment-2' });
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(conferenceInOrg) },
      reviewAssignment: {
        findFirst: jest.fn().mockResolvedValue(oldAssignment),
        update,
        create,
      },
    });

    await buildService(prisma).reassign('org-1', 'assignment-1', 'reviewer-2');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'assignment-1' },
      data: { status: 'CANCELLED' },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        abstractId: 'abs-1',
        reviewerId: 'reviewer-2',
        dueDate: undefined,
        status: 'PENDING',
        conflictOfInterest: false,
        reassignedFromId: 'assignment-1',
      },
    });
  });
});

describe('ReviewAssignmentsService.decline / declareConflict', () => {
  it('declines only the calling reviewer’s own assignment', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = fakePrisma({ reviewAssignment: { updateMany } });

    await buildService(prisma).decline('reviewer-1', 'assignment-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'assignment-1', reviewerId: 'reviewer-1' },
      data: { status: 'DECLINED' },
    });
  });

  it('throws ForbiddenException when declining an assignment that is not the caller’s', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = fakePrisma({ reviewAssignment: { updateMany } });

    await expect(
      buildService(prisma).decline('reviewer-1', 'assignment-x'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('self-declaring a conflict cancels the assignment and marks conflictOfInterest', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = fakePrisma({ reviewAssignment: { updateMany } });

    await buildService(prisma).declareConflict('reviewer-1', 'assignment-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'assignment-1', reviewerId: 'reviewer-1' },
      data: { status: 'CANCELLED', conflictOfInterest: true },
    });
  });
});

describe('ReviewAssignmentsService *ByUserId wrappers', () => {
  it('findMineByUserId aggregates assignments across every Reviewer record the user has (one per org)', async () => {
    const findManyReviewers = jest
      .fn()
      .mockResolvedValue([{ id: 'reviewer-1' }, { id: 'reviewer-2' }]);
    const findManyAssignments = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      reviewer: { findMany: findManyReviewers },
      reviewAssignment: { findMany: findManyAssignments },
    });

    await buildService(prisma).findMineByUserId('user-1');

    expect(findManyReviewers).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { id: true },
    });
    expect(findManyAssignments).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reviewerId: { in: ['reviewer-1', 'reviewer-2'] } },
      }),
    );
  });

  it('findMineByUserId returns an empty list without querying assignments when the user is not a reviewer anywhere', async () => {
    const findManyAssignments = jest.fn();
    const prisma = fakePrisma({
      reviewer: { findMany: jest.fn().mockResolvedValue([]) },
      reviewAssignment: { findMany: findManyAssignments },
    });

    const result = await buildService(prisma).findMineByUserId('user-1');

    expect(result).toEqual([]);
    expect(findManyAssignments).not.toHaveBeenCalled();
  });

  it('declineByUserId scopes the update through the reviewer.userId relation', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = fakePrisma({ reviewAssignment: { updateMany } });

    await buildService(prisma).declineByUserId('user-1', 'assignment-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'assignment-1', reviewer: { userId: 'user-1' } },
      data: { status: 'DECLINED' },
    });
  });
});

describe('ReviewAssignmentsService.findMine (blind-review projection)', () => {
  function assignmentWith(reviewMode: string) {
    return {
      id: 'assignment-1',
      status: 'PENDING',
      dueDate: null,
      assignedAt: new Date('2027-01-01'),
      review: null,
      abstract: {
        id: 'abs-1',
        title: 'A study',
        submissionType: 'ORAL',
        status: 'UNDER_REVIEW',
        submittedBy: 'user-99',
        conference: { settings: { reviewMode } },
      },
    };
  }

  it('never exposes submittedBy when the conference uses double-blind review', async () => {
    const prisma = fakePrisma({
      reviewAssignment: {
        findMany: jest.fn().mockResolvedValue([assignmentWith('DOUBLE_BLIND')]),
      },
    });

    const [result] = await buildService(prisma).findMine('reviewer-1');

    expect(result.abstract).not.toHaveProperty('submittedBy');
  });

  it('never exposes submittedBy when the conference uses single-blind review', async () => {
    const prisma = fakePrisma({
      reviewAssignment: {
        findMany: jest.fn().mockResolvedValue([assignmentWith('SINGLE_BLIND')]),
      },
    });

    const [result] = await buildService(prisma).findMine('reviewer-1');

    expect(result.abstract).not.toHaveProperty('submittedBy');
  });

  it('exposes submittedBy when the conference uses open review', async () => {
    const prisma = fakePrisma({
      reviewAssignment: {
        findMany: jest.fn().mockResolvedValue([assignmentWith('OPEN')]),
      },
    });

    const [result] = await buildService(prisma).findMine('reviewer-1');

    expect(result.abstract).toHaveProperty('submittedBy', 'user-99');
  });
});

describe('ReviewAssignmentsService.dashboard', () => {
  it('reports assigned/completed/overdue counts scoped to the conference', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(6) // completed
      .mockResolvedValueOnce(1); // overdue
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(conferenceInOrg) },
      reviewAssignment: { count },
    });

    const dashboard = await buildService(prisma).dashboard('org-1', 'conf-1');

    expect(dashboard).toEqual({ assigned: 10, completed: 6, overdue: 1 });
  });
});

describe('ReviewAssignmentsService.markOverdue', () => {
  it('flips PENDING/IN_PROGRESS assignments past their due date to OVERDUE', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 3 });
    const prisma = fakePrisma({ reviewAssignment: { updateMany } });

    const result = await buildService(prisma).markOverdue();

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: expect.any(Date) },
      },
      data: { status: 'OVERDUE' },
    });
    expect(result).toEqual({ count: 3 });
  });
});
