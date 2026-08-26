import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AbstractsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async run(conferenceId: string) {
    const rows = await this.prisma.abstract.groupBy({
      by: ['status'],
      where: { conferenceId },
      _count: { _all: true },
    });

    const byStatus: Record<string, number> = {};
    for (const row of rows) {
      byStatus[row.status] = row._count._all;
    }

    return { byStatus };
  }
}
