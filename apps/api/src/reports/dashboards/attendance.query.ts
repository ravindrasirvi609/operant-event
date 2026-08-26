import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AttendanceQuery {
  constructor(private readonly prisma: PrismaService) {}

  async run(conferenceId: string) {
    const [byTypeRows, uniqueAttendeeRows] = await Promise.all([
      this.prisma.checkin.groupBy({
        by: ['checkinType'],
        where: { conferenceId },
        _count: { _all: true },
      }),
      this.prisma.checkin.findMany({
        where: { conferenceId },
        distinct: ['registrationId'],
        select: { registrationId: true },
      }),
    ]);

    const byType: Record<string, number> = {};
    for (const row of byTypeRows) {
      byType[row.checkinType] = row._count._all;
    }

    return { byType, uniqueAttendees: uniqueAttendeeRows.length };
  }
}
