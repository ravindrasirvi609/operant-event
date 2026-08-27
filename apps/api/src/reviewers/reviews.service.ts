import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@operant-event/database';
import { PrismaService } from '../common/prisma/prisma.service';
import type { SubmitReviewDto } from './dto/submit-review.dto';

const UNREVIEWABLE_STATUSES = new Set(['DECLINED', 'CANCELLED']);

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitReview(
    reviewerId: string,
    assignmentId: string,
    dto: SubmitReviewDto,
  ) {
    return this.submit({ id: assignmentId, reviewerId }, dto);
  }

  /** Same as submitReview, but resolved by the caller's User id — a reviewer-facing request carries no reviewerId directly. */
  async submitReviewByUserId(
    userId: string,
    assignmentId: string,
    dto: SubmitReviewDto,
  ) {
    return this.submit({ id: assignmentId, reviewer: { userId } }, dto);
  }

  /** One-shot: a Review row, once created, is never updated by this method — a correction needs a separate, audited reopen action (not built yet). */
  private async submit(
    where: Prisma.ReviewAssignmentWhereInput,
    dto: SubmitReviewDto,
  ) {
    const assignment = await this.prisma.reviewAssignment.findFirst({
      where,
      include: { review: true },
    });
    if (!assignment) {
      throw new NotFoundException('Review assignment not found.');
    }
    if (UNREVIEWABLE_STATUSES.has(assignment.status)) {
      throw new BadRequestException(
        `This assignment is ${assignment.status} and cannot be reviewed.`,
      );
    }
    if (assignment.review) {
      throw new ConflictException(
        'A review has already been submitted for this assignment.',
      );
    }

    const review = await this.prisma.review.create({
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
      where: { id: assignment.id },
      data: { status: 'COMPLETED' },
    });

    return review;
  }
}
