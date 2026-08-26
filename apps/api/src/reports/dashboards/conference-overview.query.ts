import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ConferenceOverviewQuery {
  constructor(private readonly prisma: PrismaService) {}

  async run(conferenceId: string) {
    const [
      totalAbstracts,
      totalRegistrations,
      revenue,
      totalCheckins,
      totalCertificatesIssued,
    ] = await Promise.all([
      this.prisma.abstract.count({ where: { conferenceId } }),
      this.prisma.registration.count({ where: { conferenceId } }),
      this.prisma.order.aggregate({
        where: { conferenceId, status: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.checkin.count({ where: { conferenceId } }),
      this.prisma.certificate.count({
        where: { conferenceId, status: 'ISSUED' },
      }),
    ]);

    return {
      totalAbstracts,
      totalRegistrations,
      totalRevenue: Number(revenue._sum.total ?? 0),
      totalCheckins,
      totalCertificatesIssued,
    };
  }
}
