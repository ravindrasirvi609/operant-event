import { Module } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificateEligibilityService } from './certificate-eligibility.service';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [AttendanceModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificateEligibilityService],
  exports: [CertificatesService, CertificateEligibilityService],
})
export class CertificatesModule {}
