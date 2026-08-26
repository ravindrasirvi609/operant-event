import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Certificate } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CertificateEligibilityService } from './certificate-eligibility.service';
import { formatSequenceNumber } from '../common/utils/sequence-number.util';
import { isUniqueConstraintViolation } from '../common/utils/prisma-errors.util';
import { generateQrCode } from '../common/utils/qr-code.util';

const CERTIFICATE_TYPES = [
  'PARTICIPATION',
  'PRESENTATION',
  'SPEAKER',
  'REVIEWER',
  'CHAIR',
  'WORKSHOP',
];
const MAX_NUMBER_ATTEMPTS = 5;

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityService: CertificateEligibilityService,
  ) {}

  /**
   * SRS §18: evaluates every registration against every certificate type
   * and writes ELIGIBLE rows for the ones that qualify. Idempotent and
   * re-runnable — a registration/type pair that already has a Certificate
   * row (any status) is left untouched. The follow-up PDF-rendering step
   * (ELIGIBLE -> GENERATED -> ISSUED) is deferred; `issue()` below covers
   * the final ISSUED transition without a rendered file, matching the
   * Invoice PDF deferral from Phase 4.
   */
  async generateForConference(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);

    const settings = await this.prisma.conferenceSetting.findUnique({
      where: { conferenceId },
    });
    if (!settings?.certificateEnabled) {
      throw new BadRequestException(
        'Certificates are not enabled for this conference.',
      );
    }

    const registrations = await this.prisma.registration.findMany({
      where: { conferenceId },
    });
    const created: Certificate[] = [];

    for (const registration of registrations) {
      for (const certificateType of CERTIFICATE_TYPES) {
        const existing = await this.prisma.certificate.findUnique({
          where: {
            registrationId_certificateType: {
              registrationId: registration.id,
              certificateType,
            },
          },
        });
        if (existing) {
          continue;
        }

        const eligible = await this.eligibilityService.isEligible(
          certificateType,
          registration.id,
        );
        if (!eligible) {
          continue;
        }

        created.push(
          await this.createCertificateWithRetry(
            conferenceId,
            registration.id,
            certificateType,
          ),
        );
      }
    }

    return created;
  }

  /** Skips the (deferred) PDF render — transitions straight to ISSUED. */
  async issue(organizationId: string, certificateId: string) {
    const certificate = await this.assertCertificateInOrganization(
      organizationId,
      certificateId,
    );
    if (certificate.status === 'ISSUED') {
      return certificate;
    }
    return this.prisma.certificate.update({
      where: { id: certificateId },
      data: { status: 'ISSUED', issuedAt: new Date() },
    });
  }

  async findOwned(userId: string, certificateId: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id: certificateId, registration: { userId } },
    });
    if (!certificate) {
      throw new NotFoundException('Certificate not found.');
    }
    return certificate;
  }

  findForOrganizer(organizationId: string, certificateId: string) {
    return this.assertCertificateInOrganization(organizationId, certificateId);
  }

  /** Public verification, SRS §18: minimum fields only — never the raw Registration/User record. */
  async verifyByCode(code: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationCode: code },
      include: { conference: true, registration: { include: { user: true } } },
    });
    if (!certificate || certificate.status !== 'ISSUED') {
      throw new NotFoundException('Certificate not found.');
    }

    const settings = await this.prisma.conferenceSetting.findUnique({
      where: { conferenceId: certificate.conferenceId },
    });
    const { firstName, lastName } = certificate.registration.user;
    const holderName =
      (settings?.certificateShowFullName ?? true)
        ? `${firstName} ${lastName}`
        : `${firstName} ${lastName.charAt(0)}.`;

    return {
      certificateNumber: certificate.certificateNumber,
      holderName,
      conferenceName: certificate.conference.name,
      certificateType: certificate.certificateType,
      issuedAt: certificate.issuedAt,
      status: certificate.status,
    };
  }

  private async createCertificateWithRetry(
    conferenceId: string,
    registrationId: string,
    certificateType: string,
  ) {
    let sequence =
      (await this.prisma.certificate.count({ where: { conferenceId } })) + 1;

    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
      const certificateNumber = formatSequenceNumber('CERT', sequence);
      try {
        return await this.prisma.certificate.create({
          data: {
            conferenceId,
            registrationId,
            certificateType,
            certificateNumber,
            verificationCode: generateQrCode(),
            status: 'ELIGIBLE',
          },
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          sequence += 1;
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      'Could not assign a unique certificate number; please retry.',
    );
  }

  private async assertCertificateInOrganization(
    organizationId: string,
    certificateId: string,
  ) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id: certificateId, conference: { organizationId } },
    });
    if (!certificate) {
      throw new NotFoundException('Certificate not found.');
    }
    return certificate;
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
