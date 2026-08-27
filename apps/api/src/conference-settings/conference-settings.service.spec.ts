import { NotFoundException } from '@nestjs/common';
import { ConferenceSettingsService } from './conference-settings.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn() },
    conferenceSetting: { findUnique: jest.fn(), upsert: jest.fn() },
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
  it('rejects any operation on a conference outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new ConferenceSettingsService(prisma).upsert(
        'org-1',
        'conf-in-another-org',
        {
          abstractEnabled: true,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('upserts settings scoped to the conference once tenancy is confirmed', async () => {
    const upsert = jest
      .fn()
      .mockResolvedValue({ conferenceId: 'conf-1', abstractEnabled: true });
    const prisma = fakePrisma({
      conference: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'conf-1', organizationId: 'org-1' }),
      },
      conferenceSetting: { upsert },
    });

    await new ConferenceSettingsService(prisma).upsert('org-1', 'conf-1', {
      abstractEnabled: true,
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      update: { abstractEnabled: true },
      create: { conferenceId: 'conf-1', abstractEnabled: true },
    });
  });

  it('includes manualPaymentInstructions when provided', async () => {
    const upsert = jest.fn().mockResolvedValue({ conferenceId: 'conf-1' });
    const prisma = fakePrisma({
      conference: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'conf-1', organizationId: 'org-1' }),
      },
      conferenceSetting: { upsert },
    });

    await new ConferenceSettingsService(prisma).upsert('org-1', 'conf-1', {
      manualPaymentInstructions: 'Bank transfer to Acme Bank, A/C 12345.',
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
      update: {
        manualPaymentInstructions: 'Bank transfer to Acme Bank, A/C 12345.',
      },
      create: {
        conferenceId: 'conf-1',
        manualPaymentInstructions: 'Bank transfer to Acme Bank, A/C 12345.',
      },
    });
  });
});
