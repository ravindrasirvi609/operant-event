import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service';
import type { SubmitReviewDto } from './dto/submit-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a review using the reviewer's Reviewer record ID.
   *
   * This method:
   * - verifies that the assignment belongs to the reviewer
   * - rejects declined assignments
   * - prevents duplicate reviews
   * - creates the review
   * - marks the assignment as COMPLETED
   */
  async submitReview(
    reviewerId: string,
    assignmentId: string,
    dto: SubmitReviewDto,
  ) {
    const assignment =
      await this.prisma.reviewAssignment.findFirst({
        where: {
          id: assignmentId,
          reviewerId,
        },
        include: {
          review: true,
        },
      });

    if (!assignment) {
      throw new NotFoundException(
        'Review assignment not found.',
      );
    }

    if (assignment.status === 'DECLINED') {
      throw new BadRequestException(
        'A declined review assignment cannot be reviewed.',
      );
    }

    if (assignment.review) {
      throw new ConflictException(
        'A review has already been submitted for this assignment.',
      );
    }

    const review =
      await this.prisma.review.create({
        data: {
          assignmentId: assignment.id,
          overallScore: dto.overallScore,
          originalityScore: dto.originalityScore,
          methodologyScore: dto.methodologyScore,
          significanceScore: dto.significanceScore,
          presentationScore: dto.presentationScore,
          commentsToAuthor: dto.commentsToAuthor,
          privateComments: dto.privateComments,
          recommendation: dto.recommendation,
        },
      });

    await this.prisma.reviewAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        status: 'COMPLETED',
      },
    });

    return review;
  }

  /**
   * Submit a review using the authenticated user's ID.
   *
   * A user can be a reviewer in multiple organizations,
   * so the assignment is resolved through:
   *
   * assignment -> reviewer -> userId
   */
  async submitReviewByUserId(
    userId: string,
    assignmentId: string,
    dto: SubmitReviewDto,
  ) {
    const assignment =
      await this.prisma.reviewAssignment.findFirst({
        where: {
          id: assignmentId,
          reviewer: {
            userId,
          },
        },
        include: {
          review: true,
        },
      });

    if (!assignment) {
      throw new NotFoundException(
        'Review assignment not found.',
      );
    }

    if (assignment.status === 'DECLINED') {
      throw new BadRequestException(
        'A declined review assignment cannot be reviewed.',
      );
    }

    if (assignment.review) {
      throw new ConflictException(
        'A review has already been submitted for this assignment.',
      );
    }

    const review =
      await this.prisma.review.create({
        data: {
          assignmentId: assignment.id,
          overallScore: dto.overallScore,
          originalityScore: dto.originalityScore,
          methodologyScore: dto.methodologyScore,
          significanceScore: dto.significanceScore,
          presentationScore: dto.presentationScore,
          commentsToAuthor: dto.commentsToAuthor,
          privateComments: dto.privateComments,
          recommendation: dto.recommendation,
        },
      });

    await this.prisma.reviewAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        status: 'COMPLETED',
      },
    });

    return review;
  }
}