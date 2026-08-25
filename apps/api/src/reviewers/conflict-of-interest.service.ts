import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface ConflictCheckResult {
  hasConflict: boolean;
  reasons: string[];
}

/**
 * Automatic checks only cover what's actually derivable from data we have
 * (shared institution, reviewer-is-a-coauthor). "Prior collaboration" from
 * the original design notes would need a co-authorship/citation history
 * this system doesn't track yet — REV-003's "declared conflict" case is
 * handled separately, as a reviewer self-declaring on their own assignment
 * (ReviewAssignment.conflictOfInterest), not here.
 */
@Injectable()
export class ConflictOfInterestService {
  constructor(private readonly prisma: PrismaService) {}

  async check(
    reviewerId: string,
    abstractId: string,
  ): Promise<ConflictCheckResult> {
    const reviewer = await this.prisma.reviewer.findUnique({
      where: { id: reviewerId },
      include: { profile: true },
    });
    if (!reviewer) {
      throw new NotFoundException('Reviewer not found.');
    }

    const reviewerUser = await this.prisma.user.findUnique({
      where: { id: reviewer.userId },
    });
    const abstractAuthors = await this.prisma.abstractAuthor.findMany({
      where: { abstractId },
      include: { author: true },
    });

    const reasons: string[] = [];

    const isCoAuthor = abstractAuthors.some(
      (abstractAuthor) =>
        reviewerUser?.email &&
        abstractAuthor.author.email === reviewerUser.email,
    );
    if (isCoAuthor) {
      reasons.push('Reviewer is a co-author on this abstract.');
    }

    const reviewerInstitution = reviewer.profile?.institution;
    const sharesInstitution = abstractAuthors.some(
      (abstractAuthor) =>
        reviewerInstitution &&
        abstractAuthor.author.institution === reviewerInstitution,
    );
    if (sharesInstitution) {
      reasons.push(
        'Reviewer shares an institution with a co-author on this abstract.',
      );
    }

    return { hasConflict: reasons.length > 0, reasons };
  }
}
