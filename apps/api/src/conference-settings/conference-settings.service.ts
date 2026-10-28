
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FilesService, type UploadFileInput } from '../files/files.service';
import type { UpdateConferenceSettingsDto } from './dto/update-conference-settings.dto';

@Injectable()
export class ConferenceSettingsService {

constructor(
  private readonly prisma: PrismaService,
  private readonly filesService: FilesService,
) {}

  async get(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.conferenceSetting.findUnique({
      where: { conferenceId },
    });
  }

  async upsert(
    organizationId: string,
    conferenceId: string,
    dto: UpdateConferenceSettingsDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);

    if (dto.certificateTemplateFieldPositions !== undefined) {
  this.validateCertificateTemplateFieldPositions(
    dto.certificateTemplateFieldPositions,
  );
}
    const data = this.toPrismaData(dto);
    return this.prisma.conferenceSetting.upsert({
      where: { conferenceId },
      update: data,
      create: { conferenceId, ...data },
    });
  }

  async getCertificateTemplate(
  organizationId: string,
  conferenceId: string,
) {
  await this.assertConferenceInOrganization(organizationId, conferenceId);

  const settings = await this.prisma.conferenceSetting.findUnique({
    where: { conferenceId },
    select: {
      certificateTemplateFileId: true,
      certificateTemplateMimeType: true,
      certificateTemplateUpdatedAt: true,
    },
  });

  if (
    !settings?.certificateTemplateFileId ||
    !settings.certificateTemplateMimeType
  ) {
    throw new NotFoundException('Certificate template not found.');
  }

  const { file, buffer } =
    await this.filesService.downloadForOrganization(
      organizationId,
      settings.certificateTemplateFileId,
    );

  if (!['image/png', 'application/pdf'].includes(file.mimeType)) {
    throw new BadRequestException('Invalid certificate template file type.');
  }

  return {
    fileName: file.fileName,
    mimeType: file.mimeType,
    updatedAt: settings.certificateTemplateUpdatedAt,
    buffer,
  };
}


async uploadCertificateTemplate(
  organizationId: string,
  conferenceId: string,
  uploadedBy: string,
  input: UploadFileInput,
) {
  await this.assertConferenceInOrganization(organizationId, conferenceId);

  if (!['image/png', 'application/pdf'].includes(input.mimeType)) {
    throw new BadRequestException('Only PNG and PDF templates are supported.');
  }

  const file = await this.filesService.upload(
    organizationId,
    uploadedBy,
    input,
  );

  const settings = await this.prisma.conferenceSetting.upsert({
    where: { conferenceId },
    update: {
      certificateTemplateFileId: file.id,
      certificateTemplateMimeType: file.mimeType,
      certificateTemplateUpdatedAt: new Date(),
    },
    create: {
      conferenceId,
      certificateTemplateFileId: file.id,
      certificateTemplateMimeType: file.mimeType,
      certificateTemplateUpdatedAt: new Date(),
    },
  });

  return {
    message: 'Certificate template uploaded successfully.',
    templateFileId: settings.certificateTemplateFileId,
    mimeType: settings.certificateTemplateMimeType,
    updatedAt: settings.certificateTemplateUpdatedAt,
  };
}

private validateCertificateTemplateFieldPositions(
  positions: Record<string, { x: number; y: number }>,
): void {
  const allowedFields = new Set([
    'participantName',
    'conferenceName',
    'date',
    'certificateNumber',
    'qrCode',
  ]);

  for (const [field, position] of Object.entries(positions)) {
    if (!allowedFields.has(field)) {
      throw new BadRequestException(
        `Unsupported certificate field: ${field}`,
      );
    }

    if (
      !position ||
      typeof position !== 'object' ||
      typeof position.x !== 'number' ||
      typeof position.y !== 'number' ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      position.x < 0 ||
      position.x > 100 ||
      position.y < 0 ||
      position.y > 100
    ) {
      throw new BadRequestException(
        `Invalid position for ${field}. Coordinates must be between 0 and 100.`,
      );
    }
  }
}

  private toPrismaData(dto: UpdateConferenceSettingsDto) {
    return {
      ...(dto.abstractEnabled !== undefined && {
        abstractEnabled: dto.abstractEnabled,
      }),
            ...(dto.certificateTemplateFieldPositions !== undefined && {
        certificateTemplateFieldPositions:
          dto.certificateTemplateFieldPositions,
      }),
      ...(dto.abstractStartDate !== undefined && {
        abstractStartDate: new Date(dto.abstractStartDate),
      }),
      ...(dto.abstractEndDate !== undefined && {
        abstractEndDate: new Date(dto.abstractEndDate),
      }),
      ...(dto.reviewEnabled !== undefined && {
        reviewEnabled: dto.reviewEnabled,
      }),
      ...(dto.reviewMode !== undefined && { reviewMode: dto.reviewMode }),
      ...(dto.registrationEnabled !== undefined && {
        registrationEnabled: dto.registrationEnabled,
      }),
      ...(dto.registrationStartDate !== undefined && {
        registrationStartDate: new Date(dto.registrationStartDate),
      }),
      ...(dto.registrationEndDate !== undefined && {
        registrationEndDate: new Date(dto.registrationEndDate),
      }),
      ...(dto.paymentEnabled !== undefined && {
        paymentEnabled: dto.paymentEnabled,
      }),
      ...(dto.manualPaymentInstructions !== undefined && {
        manualPaymentInstructions: dto.manualPaymentInstructions,
      }),
      ...(dto.certificateEnabled !== undefined && {
        certificateEnabled: dto.certificateEnabled,
      }),
      ...(dto.checkinEnabled !== undefined && {
        checkinEnabled: dto.checkinEnabled,
      }),
    };
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
