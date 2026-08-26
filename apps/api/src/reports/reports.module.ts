import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ConferenceOverviewQuery } from './dashboards/conference-overview.query';
import { AbstractsQuery } from './dashboards/abstracts.query';
import { ReviewQuery } from './dashboards/review.query';
import { RegistrationQuery } from './dashboards/registration.query';
import { RevenueQuery } from './dashboards/revenue.query';
import { AttendanceQuery } from './dashboards/attendance.query';
import { CertificatesQuery } from './dashboards/certificates.query';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ConferenceOverviewQuery,
    AbstractsQuery,
    ReviewQuery,
    RegistrationQuery,
    RevenueQuery,
    AttendanceQuery,
    CertificatesQuery,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
