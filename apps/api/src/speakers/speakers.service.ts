import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateSpeakerDto } from './dto/create-speaker.dto';
import type { UpdateSpeakerDto } from './dto/update-speaker.dto';

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

  async update(
    organizationId: string,
    speakerId: string,
    dto: UpdateSpeakerDto,
  ) {
    await this.assertSpeakerInOrganization(organizationId, speakerId);
    return this.prisma.speaker.update({
      where: { id: speakerId },
      data: {
        ...(dto.userId !== undefined && { userId: dto.userId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.designation !== undefined && { designation: dto.designation }),
        ...(dto.institution !== undefined && { institution: dto.institution }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.photoFileId !== undefined && { photoFileId: dto.photoFileId }),
        ...(dto.country !== undefined && { country: dto.country }),
      },
    });
  }

  async remove(organizationId: string, speakerId: string) {
    await this.assertSpeakerInOrganization(organizationId, speakerId);
    await this.prisma.$transaction(async (tx) => {
      await tx.sessionSpeaker.deleteMany({ where: { speakerId } });
      await tx.programSession.updateMany({
        where: { chairId: speakerId },
        data: { chairId: null },
      });
      await tx.programSession.updateMany({
        where: { coChairId: speakerId },
        data: { coChairId: null },
      });
      await tx.speaker.delete({ where: { id: speakerId } });
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

  private async assertSpeakerInOrganization(
    organizationId: string,
    speakerId: string,
  ): Promise<void> {
    const speaker = await this.prisma.speaker.findFirst({
      where: { id: speakerId, conference: { organizationId } },
    });
    if (!speaker) {
      throw new NotFoundException('Speaker not found.');
    }
  }
}
