
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConferenceSettingsService } from './conference-settings.service';
import type { PrismaService } from '../common/prisma/prisma.service';

const fakeFilesService = {
  upload: jest.fn(),
};

function fakePrisma(
  overrides: Record<string, Record<string, jest.Mock>> = {},
) {
  const base = {
    conference: { findFirst: jest.fn() },
    conferenceSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const baseRecord = base as unknown as Record<
    string,
    Record<string, jest.Mock>
  >;

  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(baseRecord[model], methods);
  }

  return base as unknown as PrismaService;
}

describe('ConferenceSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects operations on a conference outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    const service = new ConferenceSettingsService(
      prisma,
      fakeFilesService as never,
    );

    await expect(
      service.upsert('org-1', 'conf-other', {
        abstractEnabled: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('upserts settings scoped to the conference', async () => {
    const upsert = jest.fn().mockResolvedValue({
      conferenceId: 'conf-1',
      abstractEnabled: true,
    });

    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'conf-1',
          organizationId: 'org-1',
        }),
      },
      conferenceSetting: { upsert },
    });

    const service = new ConferenceSettingsService(
      prisma,
      fakeFilesService as never,
    );

    await service.upsert('org-1', 'conf-1', {
      abstractEnabled: true,
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      update: { abstractEnabled: true },
      create: {
        conferenceId: 'conf-1',
        abstractEnabled: true,
      },
    });
  });

  it('includes manualPaymentInstructions when provided', async () => {
    const upsert = jest.fn().mockResolvedValue({
      conferenceId: 'conf-1',
    });

    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'conf-1',
          organizationId: 'org-1',
        }),
      },
      conferenceSetting: { upsert },
    });

    const service = new ConferenceSettingsService(
      prisma,
      fakeFilesService as never,
    );

    await service.upsert('org-1', 'conf-1', {
      manualPaymentInstructions:
        'Bank transfer to Acme Bank, A/C 12345.',
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      update: {
        manualPaymentInstructions:
          'Bank transfer to Acme Bank, A/C 12345.',
      },
      create: {
        conferenceId: 'conf-1',
        manualPaymentInstructions:
          'Bank transfer to Acme Bank, A/C 12345.',
      },
    });
  });

  it('uploads a PNG and saves its file ID in conference settings', async () => {
    fakeFilesService.upload.mockResolvedValue({
      id: 'file-123',
      mimeType: 'image/png',
    });

    const upsert = jest.fn().mockImplementation(async (args) => ({
      conferenceId: args.create.conferenceId,
      certificateTemplateFileId:
        args.create.certificateTemplateFileId,
      certificateTemplateMimeType:
        args.create.certificateTemplateMimeType,
      certificateTemplateUpdatedAt:
        args.create.certificateTemplateUpdatedAt,
    }));

    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'conf-1',
          organizationId: 'org-1',
        }),
      },
      conferenceSetting: { upsert },
    });

    const service = new ConferenceSettingsService(
      prisma,
      fakeFilesService as never,
    );

    const input = {
      fileName: 'certificate.png',
      mimeType: 'image/png',
      size: 1024,
      buffer: Buffer.from('fake-png'),
    };

    const result = await service.uploadCertificateTemplate(
      'org-1',
      'conf-1',
      'user-1',
      input,
    );

    expect(fakeFilesService.upload).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      input,
    );

    expect(upsert).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      update: expect.objectContaining({
        certificateTemplateFileId: 'file-123',
        certificateTemplateMimeType: 'image/png',
      }),
      create: expect.objectContaining({
        conferenceId: 'conf-1',
        certificateTemplateFileId: 'file-123',
        certificateTemplateMimeType: 'image/png',
      }),
    });

    expect(result).toMatchObject({
      message: 'Certificate template uploaded successfully.',
      templateFileId: 'file-123',
      mimeType: 'image/png',
    });
  });

  it('rejects unsupported template MIME types without uploading', async () => {
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'conf-1',
          organizationId: 'org-1',
        }),
      },
    });

    const service = new ConferenceSettingsService(
      prisma,
      fakeFilesService as never,
    );

    await expect(
      service.uploadCertificateTemplate('org-1', 'conf-1', 'user-1', {
        fileName: 'certificate.jpg',
        mimeType: 'image/jpeg',
        size: 100,
        buffer: Buffer.from('fake-jpg'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fakeFilesService.upload).not.toHaveBeenCalled();
  });

  it('rejects template uploads for a conference outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    const service = new ConferenceSettingsService(
      prisma,
      fakeFilesService as never,
    );

    await expect(
      service.uploadCertificateTemplate('org-1', 'conf-other', 'user-1', {
        fileName: 'certificate.png',
        mimeType: 'image/png',
        size: 100,
        buffer: Buffer.from('fake-png'),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(fakeFilesService.upload).not.toHaveBeenCalled();
  });
});
