import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AddReviewerDto } from './dto/add-reviewer.dto';
import type { UpdateReviewerProfileDto } from './dto/update-reviewer-profile.dto';

@Injectable()
export class ReviewersService {
  constructor(private readonly prisma: PrismaService) {}

  async addReviewer(organizationId: string, dto: AddReviewerDto) {
    const userId = dto.userId ?? (await this.resolveUserIdByEmail(dto.email));

    const existing = await this.prisma.reviewer.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (existing) {
      throw new ConflictException(
        'This user is already a reviewer in this organization.',
      );
    }

    return this.prisma.reviewer.create({
      data: { organizationId, userId, status: 'ACTIVE' },
    });
  }

  private async resolveUserIdByEmail(email?: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException(`No user found with email "${email}".`);
    }
    return user.id;
  }

  async findAll(organizationId: string) {
    return this.prisma.reviewer.findMany({
      where: { organizationId },
      include: { profile: true },
    });
  }

  async updateProfile(
    organizationId: string,
    reviewerId: string,
    dto: UpdateReviewerProfileDto,
  ) {
    await this.assertReviewerInOrganization(organizationId, reviewerId);

    const data = {
      ...(dto.institution !== undefined && { institution: dto.institution }),
      ...(dto.designation !== undefined && { designation: dto.designation }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.expertise !== undefined && { expertise: dto.expertise }),
      ...(dto.keywords !== undefined && { keywords: dto.keywords }),
    };

    return this.prisma.reviewerProfile.upsert({
      where: { reviewerId },
      update: data,
      create: { reviewerId, ...data },
    });
  }

  private async assertReviewerInOrganization(
    organizationId: string,
    reviewerId: string,
  ): Promise<void> {
    const reviewer = await this.prisma.reviewer.findFirst({
      where: { id: reviewerId, organizationId },
    });
    if (!reviewer) {
      throw new NotFoundException('Reviewer not found.');
    }
  }
}
