import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateTrackDto } from './dto/create-track.dto';
import type { UpdateTrackDto } from './dto/update-track.dto';

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    conferenceId: string,
    dto: CreateTrackDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    const sortOrder = await this.prisma.conferenceTrack.count({
      where: { conferenceId },
    });
    return this.prisma.conferenceTrack.create({
      data: {
        conferenceId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        sortOrder,
      },
    });
  }

  async findAll(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.conferenceTrack.findMany({
      where: { conferenceId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * No organization check: authors filling out a submission have no org
   * context, matching AbstractsController's own author-facing routes.
   */
  async findPublishedForSubmission(conferenceId: string) {
    return this.prisma.conferenceTrack.findMany({
      where: { conferenceId, status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async update(
    organizationId: string,
    conferenceId: string,
    trackId: string,
    dto: UpdateTrackDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.conferenceTrack.update({
      where: { id: trackId, conferenceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async reorder(
    organizationId: string,
    conferenceId: string,
    orderedTrackIds: string[],
  ): Promise<void> {
    await this.assertConferenceInOrganization(organizationId, conferenceId);

    const existing = await this.prisma.conferenceTrack.findMany({
      where: { conferenceId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((track) => track.id));
    const providedIds = new Set(orderedTrackIds);

    const sameSet =
      existingIds.size === providedIds.size &&
      [...existingIds].every((id) => providedIds.has(id));
    if (!sameSet) {
      throw new BadRequestException(
        "The reorder list must include exactly the conference's existing tracks, no more and no fewer.",
      );
    }

    await Promise.all(
      orderedTrackIds.map((id, index) =>
        this.prisma.conferenceTrack.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
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
