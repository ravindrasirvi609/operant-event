import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateRegistrationTypeDto } from './dto/create-registration-type.dto';
import type { UpdateRegistrationTypeDto } from './dto/update-registration-type.dto';

@Injectable()
export class RegistrationTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    categoryId: string,
    dto: CreateRegistrationTypeDto,
  ) {
    await this.assertCategoryInOrganization(organizationId, categoryId);
    this.assertValidDateRange(dto.startDate, dto.endDate);

    return this.prisma.registrationType.create({
      data: {
        categoryId,
        name: dto.name,
        price: dto.price,
        currency: dto.currency,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        capacity: dto.capacity,
      },
    });
  }

  async update(
    organizationId: string,
    categoryId: string,
    typeId: string,
    dto: UpdateRegistrationTypeDto,
  ) {
    await this.assertCategoryInOrganization(organizationId, categoryId);

    const existing = await this.prisma.registrationType.findFirst({
      where: {
        id: typeId,
        categoryId,
        category: {
          conference: { organizationId },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Pricing window not found.');
    }

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : existing.startDate;

    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException(
        'End date must be on or after the start date.',
      );
    }

    return this.prisma.registrationType.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.endDate !== undefined && {
          endDate: new Date(dto.endDate),
        }),
        ...(dto.capacity !== undefined && {
          capacity: dto.capacity,
        }),
      },
    });
  }

  private async assertCategoryInOrganization(
    organizationId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.prisma.registrationCategory.findFirst({
      where: {
        id: categoryId,
        conference: { organizationId },
      },
    });

    if (!category) {
      throw new NotFoundException('Registration category not found.');
    }
  }

  private assertValidDateRange(start: string, end: string): void {
    if (new Date(start).getTime() > new Date(end).getTime()) {
      throw new BadRequestException(
        'End date must be on or after the start date.',
      );
    }
  }
}
