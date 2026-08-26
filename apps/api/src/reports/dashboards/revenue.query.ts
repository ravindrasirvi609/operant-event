import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RevenueQuery {
  constructor(private readonly prisma: PrismaService) {}

  async run(conferenceId: string) {
    const collected = await this.prisma.order.aggregate({
      where: { conferenceId, status: 'PAID' },
      _sum: { total: true },
    });
    const providerRows = await this.prisma.payment.groupBy({
      by: ['provider'],
      where: { order: { conferenceId }, status: 'SUCCESS' },
      _sum: { amount: true },
    });
    const refunded = await this.prisma.order.aggregate({
      where: { conferenceId, status: 'REFUNDED' },
      _sum: { total: true },
    });

    const byProvider: Record<string, number> = {};
    for (const row of providerRows) {
      byProvider[row.provider] = Number(row._sum.amount ?? 0);
    }

    return {
      totalCollected: Number(collected._sum.total ?? 0),
      byProvider,
      totalRefunded: Number(refunded._sum.total ?? 0),
    };
  }
}
