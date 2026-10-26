
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

  /** Resolve, validate and record a check-in atomically. */
  async checkin(organizationId: string, dto: CheckinDto) {
    await this.assertConferenceInOrganization(
      organizationId,
      dto.conferenceId,
    );

    const registration = await this.resolveRegistration(dto);

    if (!registration) {
      throw new NotFoundException('No matching registration found.');
    }

    if (!CHECKED_IN_ELIGIBLE_STATUSES.includes(registration.status)) {
      throw new BadRequestException(
        `This registration is ${registration.status} and cannot be checked in.`,
      );
    }


    return this.prisma.$transaction(async (tx) => {
      // Serialize scans for this registration, including concurrent scans.
      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "registrations"
        WHERE "id" = ${registration.id}
        FOR UPDATE
      `;

      // Main-event scans must always be idempotent.
      // Re-entry must never create a duplicate main-event check-in.
      if (dto.checkinType === 'MAIN_EVENT') {
        const existing = await tx.checkin.findFirst({
          where: {
            conferenceId: dto.conferenceId,
            registrationId: registration.id,
            checkinType: 'MAIN_EVENT',
          },
          orderBy: { checkedInAt: 'asc' },
        });

        if (existing) {
          return { checkin: existing, reused: true as const };
        }
      }

      // Other check-in types retain the existing default behavior.
      // Session-specific uniqueness will be handled separately because
      // Checkin currently does not persist sessionId.
      if (dto.checkinType !== 'MAIN_EVENT' && !dto.allowReentry) {
        const existing = await tx.checkin.findFirst({
          where: {
            conferenceId: dto.conferenceId,
            registrationId: registration.id,
            checkinType: dto.checkinType,
          },
          orderBy: { checkedInAt: 'asc' },
        });

        if (existing) {
          return { checkin: existing, reused: true as const };
        }
      }

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

  async findAllForConference(
    organizationId: string,
    conferenceId: string,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    return this.prisma.checkin.findMany({
      where: { conferenceId },
      orderBy: { checkedInAt: 'desc' },
      include: { registration: true },
    });
  }

  private async resolveRegistration(dto: CheckinDto) {
    if (dto.qrCode) {
      return this.prisma.registration.findFirst({
        where: {
          conferenceId: dto.conferenceId,
          qrCode: dto.qrCode,
        },
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
        where: {
          conferenceId: dto.conferenceId,
          user: { email: dto.email },
        },
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
