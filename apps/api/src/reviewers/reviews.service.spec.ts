import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    reviewAssignment: { findFirst: jest.fn(), update: jest.fn() },
    review: { create: jest.fn() },
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

const validDto = {
  overallScore: 4,
  originalityScore: 4,
  methodologyScore: 5,
  significanceScore: 4,
  presentationScore: 3,
  recommendation: 'ACCEPT' as const,
};

describe('ReviewsService.submitReview', () => {
  it('throws NotFoundException for an assignment that is not the reviewer’s', async () => {
    const prisma = fakePrisma({
      reviewAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new ReviewsService(prisma).submitReview(
        'reviewer-1',
        'assignment-1',
        validDto,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects reviewing a declined assignment', async () => {
    const prisma = fakePrisma({
      reviewAssignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'assignment-1',
          status: 'DECLINED',
          review: null,
        }),
      },
    });

    await expect(
      new ReviewsService(prisma).submitReview(
        'reviewer-1',
        'assignment-1',
        validDto,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects submitting a second review for the same assignment', async () => {
    const prisma = fakePrisma({
      reviewAssignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'assignment-1',
          status: 'COMPLETED',
          review: { id: 'review-1' },
        }),
      },
    });

    await expect(
      new ReviewsService(prisma).submitReview(
        'reviewer-1',
        'assignment-1',
        validDto,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates the review and marks the assignment COMPLETED', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'review-1' });
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = fakePrisma({
      reviewAssignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'assignment-1',
          status: 'PENDING',
          review: null,
        }),
        update,
      },
      review: { create },
    });

    await new ReviewsService(prisma).submitReview(
      'reviewer-1',
      'assignment-1',
      validDto,
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        assignmentId: 'assignment-1',
        overallScore: 4,
        originalityScore: 4,
        methodologyScore: 5,
        significanceScore: 4,
        presentationScore: 3,
        commentsToAuthor: undefined,
        privateComments: undefined,
        recommendation: 'ACCEPT',
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'assignment-1' },
      data: { status: 'COMPLETED' },
    });
  });
});

describe('ReviewsService.submitReviewByUserId', () => {
  it('resolves the assignment through the reviewer.userId relation instead of a reviewerId', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'assignment-1',
      status: 'PENDING',
      review: null,
    });
    const prisma = fakePrisma({
      reviewAssignment: { findFirst, update: jest.fn() },
      review: { create: jest.fn().mockResolvedValue({ id: 'review-1' }) },
    });

    await new ReviewsService(prisma).submitReviewByUserId(
      'user-1',
      'assignment-1',
      validDto,
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'assignment-1', reviewer: { userId: 'user-1' } },
      include: { review: true },
    });
  });
});
