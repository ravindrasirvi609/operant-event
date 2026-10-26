import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { FormFieldType } from '@operant-event/database';
import type { Prisma } from '@operant-event/database';

import { PrismaService } from '../common/prisma/prisma.service';

import type { CreateFormFieldDto } from './dto/create-form-field.dto';
import type { UpdateFormFieldDto } from './dto/update-form-field.dto';

@Injectable()
export class ConferenceFormFieldsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    organizationId: string,
    conferenceId: string,
    dto: CreateFormFieldDto,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    const existing =
      await this.prisma.conferenceFormField.findUnique({
        where: {
          conferenceId_fieldKey: {
            conferenceId,
            fieldKey: dto.fieldKey,
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        `A field with key "${dto.fieldKey}" already exists on this conference.`,
      );
    }

    const sortOrder =
      await this.prisma.conferenceFormField.count({
        where: {
          conferenceId,
        },
      });

    return this.prisma.conferenceFormField.create({
      data: {
        conferenceId,
        section: dto.section,
        fieldKey: dto.fieldKey,
        label: dto.label,

        fieldType: dto.fieldType as FormFieldType,

        isRequired: dto.isRequired ?? false,

        optionsJson:
          dto.optionsJson !== undefined
            ? (dto.optionsJson as Prisma.InputJsonValue)
            : undefined,

        validationJson:
          dto.validationJson !== undefined
            ? (dto.validationJson as Prisma.InputJsonValue)
            : undefined,

        sortOrder,
      },
    });
  }

  /**
   * Admin Form Builder view.
   *
   * Returns both ACTIVE and DISABLED fields
   * so disabled fields can be enabled again.
   */
  async findAll(
    organizationId: string,
    conferenceId: string,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    return this.prisma.conferenceFormField.findMany({
      where: {
        conferenceId,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  /**
   * Organization-scoped active fields.
   *
   * Kept for compatibility with existing service
   * consumers and tests.
   */
  async findActive(
    organizationId: string,
    conferenceId: string,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    return this.prisma.conferenceFormField.findMany({
      where: {
        conferenceId,
        status: 'ACTIVE',
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  /**
   * Submission form view.
   *
   * Only ACTIVE fields are available to authors.
   */
  async findActiveForSubmission(
    conferenceId: string,
  ) {
    return this.prisma.conferenceFormField.findMany({
      where: {
        conferenceId,
        status: 'ACTIVE',
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  /**
   * Update an existing form field.
   *
   * Field key is intentionally not editable because
   * it identifies submitted form data.
   */
  async update(
    organizationId: string,
    conferenceId: string,
    fieldId: string,
    dto: UpdateFormFieldDto,
  ) {
    await this.assertConferenceInOrganization(
      organizationId,
      conferenceId,
    );

    const existing =
      await this.prisma.conferenceFormField.findFirst({
        where: {
          id: fieldId,
          conferenceId,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Form field not found.',
      );
    }

    return this.prisma.conferenceFormField.update({
      where: {
        id: fieldId,
      },

      data: {
        ...(dto.label !== undefined && {
          label: dto.label,
        }),

        ...(dto.fieldType !== undefined && {
          fieldType: dto.fieldType as FormFieldType,
        }),

        ...(dto.isRequired !== undefined && {
          isRequired: dto.isRequired,
        }),

        ...(dto.optionsJson !== undefined && {
          optionsJson:
            dto.optionsJson as Prisma.InputJsonValue,
        }),

        ...(dto.validationJson !== undefined && {
          validationJson:
            dto.validationJson as Prisma.InputJsonValue,
        }),

        ...(dto.sortOrder !== undefined && {
          sortOrder: dto.sortOrder,
        }),

        ...(dto.status !== undefined && {
          status: dto.status,
        }),
      },
    });
  }

  private async assertConferenceInOrganization(
    organizationId: string,
    conferenceId: string,
  ): Promise<void> {
    const conference =
      await this.prisma.conference.findFirst({
        where: {
          id: conferenceId,
          organizationId,
        },
      });

    if (!conference) {
      throw new NotFoundException(
        'Conference not found.',
      );
    }
  }
}