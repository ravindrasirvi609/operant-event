import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateRegistrationTypeDto } from './dto/create-registration-type.dto';

@Injectable()
export class RegistrationTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    categoryId: string,
    dto: CreateRegistrationTypeDto,
  ) {
    await this.assertCategoryInOrganization(organizationId, categoryId);
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

  private async assertCategoryInOrganization(
    organizationId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.prisma.registrationCategory.findFirst({
      where: { id: categoryId, conference: { organizationId } },
    });
    if (!category) {
      throw new NotFoundException('Registration category not found.');
    }
  }
}
