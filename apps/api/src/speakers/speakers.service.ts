import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateSpeakerDto } from './dto/create-speaker.dto';

@Injectable()
export class SpeakersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    conferenceId: string,
    dto: CreateSpeakerDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.speaker.create({
      data: {
        conferenceId,
        userId: dto.userId,
        name: dto.name,
        designation: dto.designation,
        institution: dto.institution,
        bio: dto.bio,
        photoFileId: dto.photoFileId,
        country: dto.country,
      },
    });
  }

  async findAll(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.speaker.findMany({ where: { conferenceId } });
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
