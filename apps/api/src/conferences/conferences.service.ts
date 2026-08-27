import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConferenceStatus } from '@operant-event/database';
import { PrismaService } from '../common/prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import { isValidConferenceStatusTransition } from './conference-status.util';
import { validateConferencePublishReadiness } from './conference-publish-validator';
import type { CreateConferenceDto } from './dto/create-conference.dto';
import type { UpdateConferenceDto } from './dto/update-conference.dto';

@Injectable()
export class ConferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    createdBy: string,
    dto: CreateConferenceDto,
  ) {
    const slug = slugify(dto.slug ?? dto.name);
    const existing = await this.prisma.conference.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
    });
    if (existing) {
      throw new ConflictException(
        `A conference with slug "${slug}" already exists in this organization.`,
      );
    }

    return this.prisma.conference.create({
      data: {
        organizationId,
        name: dto.name,
        slug,
        shortName: dto.shortName,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        timezone: dto.timezone,
        venueName: dto.venueName,
        venueAddress: dto.venueAddress,
        city: dto.city,
        country: dto.country,
        website: dto.website,
        contactEmail: dto.contactEmail,
        status: 'DRAFT',
        createdBy,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.conference.findMany({ where: { organizationId } });
  }

  /** Tenant-scoped lookup: a conference from another organization is reported as not found, never as forbidden. */
  async findOne(organizationId: string, conferenceId: string) {
    const conference = await this.prisma.conference.findFirst({
      where: { id: conferenceId, organizationId },
    });
    if (!conference) {
      throw new NotFoundException('Conference not found.');
    }
    return conference;
  }

  async update(
    organizationId: string,
    conferenceId: string,
    dto: UpdateConferenceDto,
  ) {
    await this.findOne(organizationId, conferenceId);
    return this.prisma.conference.update({
      where: { id: conferenceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.shortName !== undefined && { shortName: dto.shortName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.venueName !== undefined && { venueName: dto.venueName }),
        ...(dto.venueAddress !== undefined && {
          venueAddress: dto.venueAddress,
        }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail,
        }),
      },
    });
  }

  async changeStatus(
    organizationId: string,
    conferenceId: string,
    status: ConferenceStatus,
  ) {
    const conference = await this.findOne(organizationId, conferenceId);
    if (!isValidConferenceStatusTransition(conference.status, status)) {
      throw new BadRequestException(
        `Cannot move a conference from ${conference.status} to ${status}.`,
      );
    }
    return this.prisma.conference.update({
      where: { id: conferenceId },
      data: { status },
    });
  }

  async publish(organizationId: string, conferenceId: string) {
    const conference = await this.prisma.conference.findFirst({
      where: { id: conferenceId, organizationId },
      include: { settings: true },
    });
    if (!conference) {
      throw new NotFoundException('Conference not found.');
    }
    if (!isValidConferenceStatusTransition(conference.status, 'OPEN')) {
      throw new BadRequestException(
        `Cannot publish a conference from status ${conference.status}.`,
      );
    }

    const errors = validateConferencePublishReadiness(conference.settings);
    if (errors.length > 0) {
      throw new BadRequestException({
        message: errors,
        error: 'ConferenceNotReadyToPublish',
      });
    }

    return this.prisma.conference.update({
      where: { id: conferenceId },
      data: { status: 'OPEN' },
    });
  }
}
