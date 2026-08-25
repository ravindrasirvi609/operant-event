import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { UpdateConferenceSettingsDto } from './dto/update-conference-settings.dto';

@Injectable()
export class ConferenceSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.conferenceSetting.findUnique({
      where: { conferenceId },
    });
  }

  async upsert(
    organizationId: string,
    conferenceId: string,
    dto: UpdateConferenceSettingsDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);

    const data = this.toPrismaData(dto);
    return this.prisma.conferenceSetting.upsert({
      where: { conferenceId },
      update: data,
      create: { conferenceId, ...data },
    });
  }

  private toPrismaData(dto: UpdateConferenceSettingsDto) {
    return {
      ...(dto.abstractEnabled !== undefined && {
        abstractEnabled: dto.abstractEnabled,
      }),
      ...(dto.abstractStartDate !== undefined && {
        abstractStartDate: new Date(dto.abstractStartDate),
      }),
      ...(dto.abstractEndDate !== undefined && {
        abstractEndDate: new Date(dto.abstractEndDate),
      }),
      ...(dto.reviewEnabled !== undefined && {
        reviewEnabled: dto.reviewEnabled,
      }),
      ...(dto.reviewMode !== undefined && { reviewMode: dto.reviewMode }),
      ...(dto.registrationEnabled !== undefined && {
        registrationEnabled: dto.registrationEnabled,
      }),
      ...(dto.registrationStartDate !== undefined && {
        registrationStartDate: new Date(dto.registrationStartDate),
      }),
      ...(dto.registrationEndDate !== undefined && {
        registrationEndDate: new Date(dto.registrationEndDate),
      }),
      ...(dto.paymentEnabled !== undefined && {
        paymentEnabled: dto.paymentEnabled,
      }),
      ...(dto.certificateEnabled !== undefined && {
        certificateEnabled: dto.certificateEnabled,
      }),
      ...(dto.checkinEnabled !== undefined && {
        checkinEnabled: dto.checkinEnabled,
      }),
    };
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
