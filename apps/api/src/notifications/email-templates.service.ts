import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Conference-specific override wins over the organization-wide default.
   * Uses findFirst rather than findUnique on the compound key: conferenceId
   * is nullable, and Postgres never treats two NULLs as equal, so the
   * @@unique constraint can't be trusted as a true findUnique lookup key
   * here — same fix as the Role model's system roles in Phase 1.
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
