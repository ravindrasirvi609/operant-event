import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CertificatesQuery {
  constructor(private readonly prisma: PrismaService) {}

  async run(conferenceId: string) {
    const rows = await this.prisma.certificate.groupBy({
      by: ['certificateType', 'status'],
      where: { conferenceId },
      _count: { _all: true },
    });

    const byTypeAndStatus: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      byTypeAndStatus[row.certificateType] ??= {};
      byTypeAndStatus[row.certificateType][row.status] = row._count._all;
    }

    return { byTypeAndStatus };
  }
}
