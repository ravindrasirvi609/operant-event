
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateSponsorDto } from './dto/create-sponsor.dto';
import type { UpdateSponsorDto } from './dto/update-sponsor.dto';

const ALLOWED_LOGO_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class SponsorsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertValidLogoFile(
    organizationId: string,
    logoFileId: string,
  ): Promise<void> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: logoFileId,
        organizationId,
      },
      select: {
        id: true,
        mimeType: true,
        size: true,
      },
    });

    if (!file) {
      throw new NotFoundException(
        'Sponsor logo file not found in this organization.',
      );
    }

    if (!ALLOWED_LOGO_MIME_TYPES.has(file.mimeType.toLowerCase())) {
      throw new BadRequestException(
        'Sponsor logo must be a PNG, JPEG, or WebP image.',
      );
    }

    if (
      !Number.isSafeInteger(file.size) ||
      file.size <= 0 ||
      file.size > MAX_LOGO_SIZE_BYTES
    ) {
      throw new BadRequestException(
        'Sponsor logo must be greater than 0 and must not exceed 5 MB.',
      );
    }
  }

  async create(
    organizationId: string,
    conferenceId: string,
    dto: CreateSponsorDto,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    if (dto.logoFileId) {
      await this.assertValidLogoFile(
        organizationId,
        dto.logoFileId,
      );
    }

    return this.prisma.sponsor.create({
      data: {
        conferenceId,
        name: dto.name,
        tier: dto.tier,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        website: dto.website,
        notes: dto.notes,
        logoFileId: dto.logoFileId,
      },
    });
  }

  async findAll(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    return this.prisma.sponsor.findMany({
      where: { conferenceId },
    });
  }

  async findPublicSponsors(conferenceId: string) {
    const conference = await this.prisma.conference.findFirst({
      where: {
        id: conferenceId,
        status: 'OPEN',
      },
      select: {
        id: true,
      },
    });

    if (!conference) {
      throw new NotFoundException('Published conference not found.');
    }

    const sponsors = await this.prisma.sponsor.findMany({
      where: {
        conferenceId,
      },
      select: {
        id: true,
        name: true,
        tier: true,
        website: true,
        logoFileId: true,
      },
    });

    const tierOrder: Record<string, number> = {
      PLATINUM: 0,
      GOLD: 1,
      SILVER: 2,
      BRONZE: 3,
    };

    return sponsors.sort(
      (a, b) =>
        (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99) ||
        a.name.localeCompare(b.name),
    );
  }

  async getPublicSponsorLogo(
    conferenceId: string,
    fileId: string,
  ): Promise<string> {
    const sponsor = await this.prisma.sponsor.findFirst({
      where: {
        conferenceId,
        logoFileId: fileId,
        conference: {
          status: 'OPEN',
        },
      },
      select: {
        conference: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!sponsor) {
      throw new NotFoundException('Public sponsor logo not found.');
    }

    return sponsor.conference.organizationId;
  }

  async update(
    organizationId: string,
    sponsorId: string,
    dto: UpdateSponsorDto,
  ) {
    await this.assertSponsorInOrganization(
      organizationId,
      sponsorId,
    );

    if (dto.logoFileId) {
      await this.assertValidLogoFile(
        organizationId,
        dto.logoFileId,
      );
    }

    return this.prisma.sponsor.update({
      where: { id: sponsorId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.tier !== undefined && { tier: dto.tier }),
        ...(dto.contactName !== undefined && {
          contactName: dto.contactName,
        }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail,
        }),
        ...(dto.website !== undefined && {
          website: dto.website,
        }),
        ...(dto.notes !== undefined && {
          notes: dto.notes,
        }),
        ...(dto.logoFileId !== undefined && {
          logoFileId: dto.logoFileId,
        }),
        ...(dto.paymentStatus !== undefined && {
          paymentStatus: dto.paymentStatus,
        }),
      },
    });
  }

  async remove(
    organizationId: string,
    sponsorId: string,
  ): Promise<void> {
    await this.assertSponsorInOrganization(
      organizationId,
      sponsorId,
    );

    await this.prisma.sponsor.delete({
      where: { id: sponsorId },
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

  private async assertSponsorInOrganization(
    organizationId: string,
    sponsorId: string,
  ) {
    const sponsor = await this.prisma.sponsor.findFirst({
      where: {
        id: sponsorId,
        conference: { organizationId },
      },
    });

    if (!sponsor) {
      throw new NotFoundException('Sponsor not found.');
    }

    return sponsor;
  }
}
