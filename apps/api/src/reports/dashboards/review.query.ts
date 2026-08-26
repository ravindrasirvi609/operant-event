import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReviewQuery {
  constructor(private readonly prisma: PrismaService) {}

  async run(conferenceId: string) {
    const [statusRows, scoreAggregate, overdueCount] = await Promise.all([
      this.prisma.reviewAssignment.groupBy({
        by: ['status'],
        where: { abstract: { conferenceId } },
        _count: { _all: true },
      }),
      this.prisma.review.aggregate({
        where: { assignment: { abstract: { conferenceId } } },
        _avg: { overallScore: true },
      }),
      this.prisma.reviewAssignment.count({
        where: { abstract: { conferenceId }, status: 'OVERDUE' },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusRows) {
      byStatus[row.status] = row._count._all;
    }

    return {
      byStatus,
      averageOverallScore: Number(scoreAggregate._avg.overallScore ?? 0),
      overdueCount,
    };
  }
}
