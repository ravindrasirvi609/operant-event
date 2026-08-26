import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DASHBOARDS } from './dashboard.constants';
import { ConferenceOverviewQuery } from './dashboards/conference-overview.query';
import { AbstractsQuery } from './dashboards/abstracts.query';
import { ReviewQuery } from './dashboards/review.query';
import { RegistrationQuery } from './dashboards/registration.query';
import { RevenueQuery } from './dashboards/revenue.query';
import { AttendanceQuery } from './dashboards/attendance.query';
import { CertificatesQuery } from './dashboards/certificates.query';

/**
 * §22: this is the highest-risk service in the phase for accidentally
 * becoming a "query anything" admin backdoor — every dashboard is
 * dispatched only AFTER assertConferenceInOrganization confirms the
 * caller's organization owns conferenceId, exactly like every other
 * tenant-scoped module in this codebase (never a raw unscoped query).
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conferenceOverviewQuery: ConferenceOverviewQuery,
    private readonly abstractsQuery: AbstractsQuery,
    private readonly reviewQuery: ReviewQuery,
    private readonly registrationQuery: RegistrationQuery,
    private readonly revenueQuery: RevenueQuery,
    private readonly attendanceQuery: AttendanceQuery,
    private readonly certificatesQuery: CertificatesQuery,
  ) {}

  async getDashboard(
    organizationId: string,
    conferenceId: string,
    dashboard: string,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);

    switch (dashboard) {
      case DASHBOARDS.CONFERENCE_OVERVIEW:
        return this.conferenceOverviewQuery.run(conferenceId);
      case DASHBOARDS.ABSTRACTS:
        return this.abstractsQuery.run(conferenceId);
      case DASHBOARDS.REVIEW:
        return this.reviewQuery.run(conferenceId);
      case DASHBOARDS.REGISTRATION:
        return this.registrationQuery.run(conferenceId);
      case DASHBOARDS.REVENUE:
        return this.revenueQuery.run(conferenceId);
      case DASHBOARDS.ATTENDANCE:
        return this.attendanceQuery.run(conferenceId);
      case DASHBOARDS.CERTIFICATES:
        return this.certificatesQuery.run(conferenceId);
      default:
        throw new NotFoundException(`Unknown dashboard "${dashboard}".`);
    }
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
