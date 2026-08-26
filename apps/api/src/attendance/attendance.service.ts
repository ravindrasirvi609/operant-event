import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Feeds CertificateEligibilityService's PARTICIPATION rule. */
  countForRegistration(registrationId: string): Promise<number> {
    return this.prisma.attendance.count({ where: { registrationId } });
  }

  async findAllForConference(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.attendance.findMany({
      where: { conferenceId },
      orderBy: { checkedInAt: 'desc' },
      include: { registration: true, session: true },
    });
  }

  private async assertConferenceInOrganization(
    organizationId: string,
    conferenceId: string,
  ): Promise<void> {
    const conference = await this.prisma.conference.findFirst({
      where: { id: conferenceId, organizationId },
    });
    if (!conference) {
      throw new NotFoundException('Conference not found.');
    }
  }
}
