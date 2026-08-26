import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { formatSequenceNumber } from '../common/utils/sequence-number.util';
import { isUniqueConstraintViolation } from '../common/utils/prisma-errors.util';
import { resolveEffectivePricingWindow } from './pricing.util';

const NON_ACTIVE_STATUSES = ['CANCELLED', 'REFUNDED'] as const;
const MAX_NUMBER_ATTEMPTS = 5;

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Takes a category, not a specific pricing window id: the effective
   * window for "now" is resolved server-side (REG-002), so a stale
   * frontend showing an expired Early Bird price can never be submitted
   * against.
   */
  async register(conferenceId: string, userId: string, categoryId: string) {
    const category = await this.prisma.registrationCategory.findFirst({
      where: { id: categoryId, conferenceId },
      include: { types: true },
    });
    if (!category) {
      throw new NotFoundException('Registration category not found.');
    }

    const effective = resolveEffectivePricingWindow(
      category.types.map((type) => ({
        id: type.id,
        price: Number(type.price),
        startDate: type.startDate,
        endDate: type.endDate,
      })),
      new Date(),
    );
    if (!effective) {
      throw new BadRequestException(
        'No pricing window is currently active for this category.',
      );
    }
    const registrationType = category.types.find(
      (type) => type.id === effective.id,
    );
    if (!registrationType) {
      throw new BadRequestException(
        'No pricing window is currently active for this category.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (registrationType.capacity !== null) {
        const activeCount = await tx.registration.count({
          where: {
            registrationTypeId: registrationType.id,
            status: { notIn: [...NON_ACTIVE_STATUSES] },
          },
        });
        if (activeCount >= registrationType.capacity) {
          throw new ConflictException(
            'This registration category is at capacity.',
          );
        }
      }

      let sequence =
        (await tx.registration.count({ where: { conferenceId } })) + 1;

      for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
        const registrationNumber = formatSequenceNumber('REG', sequence);
        try {
          return await tx.registration.create({
            data: {
              conferenceId,
              registrationNumber,
              userId,
              registrationTypeId: registrationType.id,
              status: 'PENDING',
              totalAmount: registrationType.price,
              currency: registrationType.currency,
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
        'Could not assign a unique registration number; please retry.',
      );
    });
  }

  async findOwned(userId: string, registrationId: string) {
    const registration = await this.prisma.registration.findFirst({
      where: { id: registrationId, userId },
    });
    if (!registration) {
      throw new NotFoundException('Registration not found.');
    }
    return registration;
  }
}
