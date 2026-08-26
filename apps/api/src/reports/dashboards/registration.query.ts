import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RegistrationQuery {
  constructor(private readonly prisma: PrismaService) {}

  async run(conferenceId: string) {
    const [statusRows, typeRows] = await Promise.all([
      this.prisma.registration.groupBy({
        by: ['status'],
        where: { conferenceId },
        _count: { _all: true },
      }),
      this.prisma.registration.groupBy({
        by: ['registrationTypeId'],
        where: { conferenceId },
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusRows) {
      byStatus[row.status] = row._count._all;
    }

    const byType: Record<string, number> = {};
    if (typeRows.length > 0) {
      const types = await this.prisma.registrationType.findMany({
        where: { id: { in: typeRows.map((row) => row.registrationTypeId) } },
      });
      const nameById = new Map(types.map((type) => [type.id, type.name]));
      for (const row of typeRows) {
        const name =
          nameById.get(row.registrationTypeId) ?? row.registrationTypeId;
        byType[name] = row._count._all;
      }
    }

    return { byStatus, byType };
  }
}
