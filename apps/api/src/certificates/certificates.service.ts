
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Certificate } from '@operant-event/database';
import { PrismaService } from '../common/prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CertificateEligibilityService } from './certificate-eligibility.service';
import { formatSequenceNumber } from '../common/utils/sequence-number.util';
import { isUniqueConstraintViolation } from '../common/utils/prisma-errors.util';
import { generateQrCode } from '../common/utils/qr-code.util';
import { NOTIFICATION_EVENTS } from '../notifications/notification.events';
import { renderCertificatePdf } from '../common/pdf/pdf-renderer.util';

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
    private readonly eventEmitter: EventEmitter2,
    private readonly filesService: FilesService,
  ) {}


async downloadOwnedCertificate(userId: string, certificateId: string) {
  const certificate = await this.prisma.certificate.findFirst({
    where: {
      id: certificateId,
      registration: { userId },
    },
    select: {
      status: true,
      fileId: true,
      conferenceId: true,
      conference: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (
    !certificate ||
    certificate.status !== 'ISSUED' ||
    !certificate.fileId
  ) {
    throw new NotFoundException('Certificate not available.');
  }

  const feedback = await this.prisma.conferenceFeedback.findUnique({
    where: {
      conferenceId_userId: {
        conferenceId: certificate.conferenceId,
        userId,
      },
    },
    select: { id: true },
  });

  if (!feedback) {
    throw new BadRequestException(
      'Please submit conference feedback before downloading your certificate.',
    );
  }

  return this.filesService.downloadForOrganization(
    certificate.conference.organizationId,
    certificate.fileId,
  );
}


  /**
   * Returns certificates for a conference owned by the organization.
   */
  async findAllForConference(
    organizationId: string,
    conferenceId: string,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    return this.prisma.certificate.findMany({
      where: { conferenceId },
      include: {
        registration: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Creates ELIGIBLE certificate records for registrations that qualify.
   */
  async generateForConference(
    organizationId: string,
    conferenceId: string,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

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

  /**
   * Issues a certificate and stores its PDF.
   */
  async issue(organizationId: string, certificateId: string) {
    const certificate = await this.assertCertificateInOrganization(
      organizationId,
      certificateId,
    );

    if (certificate.status === 'ISSUED') {
      return certificate;
    }

    if (certificate.status === 'REVOKED') {
      throw new BadRequestException(
        'A revoked certificate cannot be issued again.',
      );
    }

    const settings = await this.prisma.conferenceSetting.findUnique({
      where: { conferenceId: certificate.conferenceId },
    });

    const holderName = this.resolveHolderName(
      settings?.certificateShowFullName ?? true,
      certificate.registration.user.firstName,
      certificate.registration.user.lastName,
    );

    const template = settings?.certificateTemplateFileId
      ? await this.filesService.downloadForOrganization(
          certificate.conference.organizationId,
          settings.certificateTemplateFileId,
        )
      : null;

    const templateMimeType = template?.file.mimeType;

    if (
      templateMimeType &&
      !['image/png', 'application/pdf'].includes(templateMimeType)
    ) {
      throw new BadRequestException(
        'Unsupported certificate template MIME type. Use PNG or PDF.',
      );
    }

    const fieldPositions = settings?.certificateTemplateFieldPositions
      ? (settings.certificateTemplateFieldPositions as Record<
          string,
          { x: number; y: number }
        >)
      : undefined;

    const issuedAt = new Date();

    const buffer = await renderCertificatePdf({
      certificateNumber: certificate.certificateNumber,
      certificateType: certificate.certificateType,
      holderName,
      conferenceName: certificate.conference.name,
      issuedAt,
      verificationCode: certificate.verificationCode,
      templateBuffer: template?.buffer,
      templateMimeType,
      fieldPositions,
    });

    const file = await this.filesService.upload(
      certificate.conference.organizationId,
      certificate.registration.userId,
      {
        fileName: `${certificate.certificateNumber}.pdf`,
        mimeType: 'application/pdf',
        size: buffer.length,
        buffer,
      },
    );

    const updated = await this.prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: 'ISSUED',
        issuedAt,
        fileId: file.id,
      },
    });

    this.eventEmitter.emit(
      NOTIFICATION_EVENTS.CERTIFICATE_ISSUED,
      {
        organizationId,
        conferenceId: certificate.conferenceId,
        userId: certificate.registration.userId,
        templateData: {
          certificateType: certificate.certificateType,
          certificateNumber: updated.certificateNumber,
        },
        entityType: 'certificate',
        entityId: certificateId,
      },
    );

    return updated;
  }


  /**
   * Regenerates the PDF for an already-issued certificate using
   * the conference's latest saved template.
   *
   * Certificate number, verification code and issue date are preserved.
   */
  async regenerateIssuedCertificatePdf(
    organizationId: string,
    certificateId: string,
  ) {
    const certificate = await this.assertCertificateInOrganization(
      organizationId,
      certificateId,
    );

    if (certificate.status !== 'ISSUED') {
      throw new BadRequestException(
        'Only an ISSUED certificate PDF can be regenerated.',
      );
    }

    const settings = await this.prisma.conferenceSetting.findUnique({
      where: { conferenceId: certificate.conferenceId },
    });

    const holderName = this.resolveHolderName(
      settings?.certificateShowFullName ?? true,
      certificate.registration.user.firstName,
      certificate.registration.user.lastName,
    );

    const template = settings?.certificateTemplateFileId
      ? await this.filesService.downloadForOrganization(
          certificate.conference.organizationId,
          settings.certificateTemplateFileId,
        )
      : null;

    const templateMimeType = template?.file.mimeType;

    if (
      templateMimeType &&
      !['image/png', 'application/pdf'].includes(templateMimeType)
    ) {
      throw new BadRequestException(
        'Unsupported certificate template MIME type. Use PNG or PDF.',
      );
    }

    const fieldPositions = settings?.certificateTemplateFieldPositions
      ? (settings.certificateTemplateFieldPositions as Record<
          string,
          { x: number; y: number }
        >)
      : undefined;

    const issuedAt = certificate.issuedAt ?? new Date();

    const buffer = await renderCertificatePdf({
      certificateNumber: certificate.certificateNumber,
      certificateType: certificate.certificateType,
      holderName,
      conferenceName: certificate.conference.name,
      issuedAt,
      verificationCode: certificate.verificationCode,
      templateBuffer: template?.buffer,
      templateMimeType,
      fieldPositions,
    });

    const file = await this.filesService.upload(
      certificate.conference.organizationId,
      certificate.registration.userId,
      {
        fileName: `${certificate.certificateNumber}.pdf`,
        mimeType: 'application/pdf',
        size: buffer.length,
        buffer,
      },
    );

    // Update only the PDF file reference. Preserve issuance metadata.
    return this.prisma.certificate.update({
      where: { id: certificateId },
      data: {
        fileId: file.id,
      },
    });
  }


  /**
   * Revokes an issued certificate.
   */
  async revoke(organizationId: string, certificateId: string) {
    const certificate = await this.assertCertificateInOrganization(
      organizationId,
      certificateId,
    );

    if (certificate.status !== 'ISSUED') {
      throw new BadRequestException(
        'Only an ISSUED certificate can be revoked.',
      );
    }

    return this.prisma.certificate.update({
      where: { id: certificateId },
      data: { status: 'REVOKED' },
    });
  }

  /**
   * Finds a certificate belonging to the specified user.
   */
  async findOwned(userId: string, certificateId: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: {
        id: certificateId,
        registration: { userId },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found.');
    }

    return certificate;
  }

  /**
   * Returns only the current participant's certificates.
   */
  async findMine(userId: string) {
    return this.prisma.certificate.findMany({
      where: {
        registration: { userId },
      },
      include: {
        conference: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }


async getMyConferenceFeedback(userId: string, conferenceId: string) {
  const registration = await this.prisma.registration.findFirst({
    where: { userId, conferenceId },
    select: { id: true },
  });

  if (!registration) {
    throw new NotFoundException(
      'Registration for this conference was not found.',
    );
  }

  return this.prisma.conferenceFeedback.findUnique({
    where: {
      conferenceId_userId: { conferenceId, userId },
    },
  });
}


async submitConferenceFeedback(
  userId: string,
  conferenceId: string,
  input: {
    rating: number;
    contentRating: string;
    comments?: string;
  },
) {
  if (
    !Number.isInteger(input.rating) ||
    input.rating < 1 ||
    input.rating > 5
  ) {
    throw new BadRequestException('Rating must be between 1 and 5.');
  }

  const allowedContentRatings = [
    'Excellent',
    'Good',
    'Average',
    'Needs improvement',
  ];

  if (!allowedContentRatings.includes(input.contentRating)) {
    throw new BadRequestException('Invalid content rating.');
  }

  const registration = await this.prisma.registration.findFirst({
    where: { userId, conferenceId },
    select: { id: true },
  });

  if (!registration) {
    throw new NotFoundException(
      'Registration for this conference was not found.',
    );
  }

  const existing = await this.prisma.conferenceFeedback.findUnique({
    where: {
      conferenceId_userId: { conferenceId, userId },
    },
  });

  if (existing) {
    throw new ConflictException(
      'Feedback has already been submitted for this conference.',
    );
  }

  const feedback = await this.prisma.conferenceFeedback.create({
    data: {
      conferenceId,
      userId,
      rating: input.rating,
      contentRating: input.contentRating,
      comments: input.comments?.trim() || null,
    },
  });

  const conference = await this.prisma.conference.findUnique({
    where: { id: conferenceId },
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  });

  if (conference) {
    this.eventEmitter.emit(
      NOTIFICATION_EVENTS.CONFERENCE_FEEDBACK_SUBMITTED,
      {
        organizationId: conference.organizationId,
        conferenceId: conference.id,
        userId,
        templateData: {
          conferenceName: conference.name,
          certificatesUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/certificates`,
        },
        entityType: 'conference_feedback',
        entityId: feedback.id,
      },
    );
  }

  return feedback;
}


  findForOrganizer(
    organizationId: string,
    certificateId: string,
  ) {
    return this.assertCertificateInOrganization(
      organizationId,
      certificateId,
    );
  }

  /**
   * Public verification returns only the necessary certificate details.
   */
  async verifyByCode(code: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationCode: code },
      include: {
        conference: true,
        registration: {
          include: { user: true },
        },
      },
    });

    if (!certificate || certificate.status !== 'ISSUED') {
      throw new NotFoundException('Certificate not found.');
    }

    const settings = await this.prisma.conferenceSetting.findUnique({
      where: { conferenceId: certificate.conferenceId },
    });

    const { firstName, lastName } = certificate.registration.user;

    const holderName = this.resolveHolderName(
      settings?.certificateShowFullName ?? true,
      firstName,
      lastName,
    );

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
      (await this.prisma.certificate.count({
        where: { conferenceId },
      })) + 1;

    for (
      let attempt = 0;
      attempt < MAX_NUMBER_ATTEMPTS;
      attempt++
    ) {
      const certificateNumber = formatSequenceNumber(
        'CERT',
        sequence,
      );

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

  private resolveHolderName(
    showFullName: boolean,
    firstName: string,
    lastName: string,
  ): string {
    return showFullName
      ? `${firstName} ${lastName}`
      : `${firstName} ${lastName.charAt(0)}.`;
  }

  private async assertCertificateInOrganization(
    organizationId: string,
    certificateId: string,
  ) {
    const certificate = await this.prisma.certificate.findFirst({
      where: {
        id: certificateId,
        conference: { organizationId },
      },
      include: {
        registration: {
          include: { user: true },
        },
        conference: true,
      },
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
      where: {
        id: conferenceId,
        organizationId,
      },
    });

    if (!conference) {
      throw new NotFoundException('Conference not found.');
    }
  }
}
