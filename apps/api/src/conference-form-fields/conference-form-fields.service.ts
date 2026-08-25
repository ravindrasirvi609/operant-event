import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateFormFieldDto } from './dto/create-form-field.dto';
import type { UpdateFormFieldDto } from './dto/update-form-field.dto';

@Injectable()
export class ConferenceFormFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    conferenceId: string,
    dto: CreateFormFieldDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);

    const existing = await this.prisma.conferenceFormField.findUnique({
      where: {
        conferenceId_fieldKey: { conferenceId, fieldKey: dto.fieldKey },
      },
    });
    if (existing) {
      throw new ConflictException(
        `A field with key "${dto.fieldKey}" already exists on this conference.`,
      );
    }

    const sortOrder = await this.prisma.conferenceFormField.count({
      where: { conferenceId },
    });
    return this.prisma.conferenceFormField.create({
      data: {
        conferenceId,
        section: dto.section,
        fieldKey: dto.fieldKey,
        label: dto.label,
        fieldType: dto.fieldType,
        isRequired: dto.isRequired ?? false,
        optionsJson: dto.optionsJson as Prisma.InputJsonValue | undefined,
        validationJson: dto.validationJson as Prisma.InputJsonValue | undefined,
        sortOrder,
      },
    });
  }

  /** The set the dynamic form renderer and the submit-time validator both use. */
  async findActive(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.conferenceFormField.findMany({
      where: { conferenceId, status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Disabling is a status flip, never a delete — historical AbstractVersion.formData must stay interpretable. */
  async update(
    organizationId: string,
    conferenceId: string,
    fieldId: string,
    dto: UpdateFormFieldDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.conferenceFormField.update({
      where: { id: fieldId, conferenceId },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.optionsJson !== undefined && {
          optionsJson: dto.optionsJson as Prisma.InputJsonValue,
        }),
        ...(dto.validationJson !== undefined && {
          validationJson: dto.validationJson as Prisma.InputJsonValue,
        }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
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
}
