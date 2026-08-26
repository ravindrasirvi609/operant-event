import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateSponsorDto } from './dto/create-sponsor.dto';
import type { UpdateSponsorDto } from './dto/update-sponsor.dto';

@Injectable()
export class SponsorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    conferenceId: string,
    dto: CreateSponsorDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.sponsor.create({
      data: {
        conferenceId,
        name: dto.name,
        tier: dto.tier,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        logoFileId: dto.logoFileId,
      },
    });
  }

  async findAll(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.sponsor.findMany({ where: { conferenceId } });
  }

  async update(
    organizationId: string,
    sponsorId: string,
    dto: UpdateSponsorDto,
  ) {
    await this.assertSponsorInOrganization(organizationId, sponsorId);
    return this.prisma.sponsor.update({
      where: { id: sponsorId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.tier !== undefined && { tier: dto.tier }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail,
        }),
        ...(dto.logoFileId !== undefined && { logoFileId: dto.logoFileId }),
        ...(dto.paymentStatus !== undefined && {
          paymentStatus: dto.paymentStatus,
        }),
      },
    });
  }

  async remove(organizationId: string, sponsorId: string): Promise<void> {
    await this.assertSponsorInOrganization(organizationId, sponsorId);
    await this.prisma.sponsor.delete({ where: { id: sponsorId } });
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

  private async assertSponsorInOrganization(
    organizationId: string,
    sponsorId: string,
  ) {
    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id: sponsorId, conference: { organizationId } },
    });
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found.');
    }
    return sponsor;
  }
}
