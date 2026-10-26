
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

const FEEDBACK_SUBMITTED_EVENT = 'conference.feedback_submitted';

const FEEDBACK_CERTIFICATE_SUBJECT =
  'Your {{conferenceName}} Certificate Is Ready';

const FEEDBACK_CERTIFICATE_BODY = [
  'Hello,',
  '',
  'Thank you for submitting your feedback for {{conferenceName}}.',
  '',
  'You can visit the Certificates page to check your eligibility and download your certificate.',
  '',
  'Certificates page: {{certificatesUrl}}',
  '',
  'Regards,',
  'Conference Organizing Team',
].join('\n');

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A conference-specific template takes priority over the organization default.
   */
  async resolve(
    organizationId: string,
    conferenceId: string | null,
    event: string,
  ) {
    if (conferenceId) {
      const specific = await this.prisma.emailTemplate.findFirst({
        where: { organizationId, conferenceId, event },
      });

      if (specific) {
        return specific;
      }
    }

    return this.prisma.emailTemplate.findFirst({
      where: { organizationId, conferenceId: null, event },
    });
  }

  findAll(organizationId: string, conferenceId?: string) {
    return this.prisma.emailTemplate.findMany({
      where: conferenceId
        ? { organizationId, OR: [{ conferenceId }, { conferenceId: null }] }
        : { organizationId },
    });
  }

  /**
   * Creates the feedback certificate email template if it does not exist.
   * If conferenceId is omitted, creates an organization-wide default.
   */
  async ensureFeedbackCertificateTemplate(
    organizationId: string,
    conferenceId?: string,
  ) {
    if (conferenceId) {
      const conference = await this.prisma.conference.findFirst({
        where: { id: conferenceId, organizationId },
        select: { id: true },
      });

      if (!conference) {
        throw new NotFoundException(
          'Conference not found in the current organization.',
        );
      }
    }

    const existing = await this.prisma.emailTemplate.findFirst({
      where: {
        organizationId,
        conferenceId: conferenceId ?? null,
        event: FEEDBACK_SUBMITTED_EVENT,
      },
    });

    if (existing) {
      return {
        created: false,
        template: existing,
      };
    }

    const template = await this.prisma.emailTemplate.create({
      data: {
        organizationId,
        conferenceId: conferenceId ?? null,
        event: FEEDBACK_SUBMITTED_EVENT,
        subject: FEEDBACK_CERTIFICATE_SUBJECT,
        body: FEEDBACK_CERTIFICATE_BODY,
      },
    });

    return {
      created: true,
      template,
    };
  }

  async update(
    organizationId: string,
    templateId: string,
    dto: UpdateEmailTemplateDto,
  ) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Email template not found.');
    }

    return this.prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.body !== undefined && { body: dto.body }),
      },
    });
  }
}
