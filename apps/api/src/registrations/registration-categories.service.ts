import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateRegistrationCategoryDto } from './dto/create-registration-category.dto';

@Injectable()
export class RegistrationCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    conferenceId: string,
    dto: CreateRegistrationCategoryDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.registrationCategory.create({
      data: { conferenceId, name: dto.name, description: dto.description },
    });
  }

  async findAll(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.registrationCategory.findMany({
      where: { conferenceId },
      include: { types: true },
    });
  }

  /**
   * No organization check: a registrant browsing categories to register
   * for has no org context, matching RegistrationsController's own
   * registrant-facing routes.
   */
  async findAllForRegistration(conferenceId: string) {
    return this.prisma.registrationCategory.findMany({
      where: { conferenceId },
      include: { types: true },
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
