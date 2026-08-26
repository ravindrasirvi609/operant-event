import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CheckinDto } from './dto/checkin.dto';

const CHECKED_IN_ELIGIBLE_STATUSES = ['CONFIRMED', 'CHECKED_IN'];

@Injectable()
export class CheckinsService {
  constructor(private readonly prisma: PrismaService) {}

  /** SRS §17: QR scan / manual search -> resolve -> validate -> record -> attendance. */
  async checkin(organizationId: string, dto: CheckinDto) {
    await this.assertConferenceInOrganization(organizationId, dto.conferenceId);

    const registration = await this.resolveRegistration(dto);
    if (!registration) {
      throw new NotFoundException('No matching registration found.');
    }
    if (!CHECKED_IN_ELIGIBLE_STATUSES.includes(registration.status)) {
      throw new BadRequestException(
        `This registration is ${registration.status} and cannot be checked in.`,
      );
    }

    if (!dto.allowReentry) {
      const existing = await this.prisma.checkin.findFirst({
        where: {
          registrationId: registration.id,
          checkinType: dto.checkinType,
        },
      });
      if (existing) {
        return { checkin: existing, reused: true as const };
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const checkin = await tx.checkin.create({
        data: {
          conferenceId: dto.conferenceId,
          registrationId: registration.id,
          checkinType: dto.checkinType,
          deviceId: dto.deviceId,
        },
      });
      await tx.attendance.create({
        data: {
          conferenceId: dto.conferenceId,
          registrationId: registration.id,
          sessionId: dto.sessionId,
        },
      });
      if (registration.status !== 'CHECKED_IN') {
        await tx.registration.update({
          where: { id: registration.id },
          data: { status: 'CHECKED_IN' },
        });
      }
      return { checkin, reused: false as const };
    });
  }

  async findAllForConference(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.checkin.findMany({
      where: { conferenceId },
      orderBy: { checkedInAt: 'desc' },
      include: { registration: true },
    });
  }

  private async resolveRegistration(dto: CheckinDto) {
    if (dto.qrCode) {
      return this.prisma.registration.findFirst({
        where: { conferenceId: dto.conferenceId, qrCode: dto.qrCode },
      });
    }
    if (dto.registrationNumber) {
      return this.prisma.registration.findFirst({
        where: {
          conferenceId: dto.conferenceId,
          registrationNumber: dto.registrationNumber,
        },
      });
    }
    if (dto.email) {
      return this.prisma.registration.findFirst({
        where: { conferenceId: dto.conferenceId, user: { email: dto.email } },
      });
    }
    throw new BadRequestException(
      'Provide a qrCode, registrationNumber, or email to resolve a registration.',
    );
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
