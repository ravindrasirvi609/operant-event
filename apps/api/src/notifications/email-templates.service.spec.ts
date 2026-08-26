import { NotFoundException } from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    emailTemplate: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
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

describe('EmailTemplatesService.resolve', () => {
  it('prefers a conference-specific override over the organization-wide default', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: 'template-specific' });
    const prisma = fakePrisma({
      emailTemplate: { findFirst, findMany: jest.fn(), update: jest.fn() },
    });
    const service = new EmailTemplatesService(prisma);

    const result = await service.resolve(
      'org-1',
      'conf-1',
      'abstract.accepted',
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        conferenceId: 'conf-1',
        event: 'abstract.accepted',
      },
    });
    expect(result).toEqual({ id: 'template-specific' });
  });

  it('falls back to the organization-wide default when no conference-specific override exists', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'template-default' });
    const prisma = fakePrisma({
      emailTemplate: { findFirst, findMany: jest.fn(), update: jest.fn() },
    });
    const service = new EmailTemplatesService(prisma);

    const result = await service.resolve(
      'org-1',
      'conf-1',
      'abstract.accepted',
    );

    expect(findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        organizationId: 'org-1',
        conferenceId: null,
        event: 'abstract.accepted',
      },
    });
    expect(result).toEqual({ id: 'template-default' });
  });

  it('goes straight to the organization-wide default when no conferenceId is given', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'template-default' });
    const prisma = fakePrisma({
      emailTemplate: { findFirst, findMany: jest.fn(), update: jest.fn() },
    });
    const service = new EmailTemplatesService(prisma);

    await service.resolve('org-1', null, 'abstract.accepted');

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        conferenceId: null,
        event: 'abstract.accepted',
      },
    });
  });

  it('returns null when neither a specific nor a default template exists', async () => {
    const prisma = fakePrisma({
      emailTemplate: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new EmailTemplatesService(prisma);

    await expect(
      service.resolve('org-1', 'conf-1', 'abstract.accepted'),
    ).resolves.toBeNull();
  });
});

describe('EmailTemplatesService.findAll', () => {
  it('lists organization-wide templates when no conferenceId is given', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      emailTemplate: { findFirst: jest.fn(), findMany, update: jest.fn() },
    });
    const service = new EmailTemplatesService(prisma);

    await service.findAll('org-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
    });
  });

  it('includes both conference-specific and organization-wide templates when a conferenceId is given', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      emailTemplate: { findFirst: jest.fn(), findMany, update: jest.fn() },
    });
    const service = new EmailTemplatesService(prisma);

    await service.findAll('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        OR: [{ conferenceId: 'conf-1' }, { conferenceId: null }],
      },
    });
  });
});

describe('EmailTemplatesService.update', () => {
  it('throws NotFoundException when the template is outside the caller organization', async () => {
    const prisma = fakePrisma({
      emailTemplate: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new EmailTemplatesService(prisma);

    await expect(
      service.update('org-1', 'template-x', { subject: 'New subject' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates only the provided fields', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'template-1' });
    const prisma = fakePrisma({
      emailTemplate: {
        findFirst: jest.fn().mockResolvedValue({ id: 'template-1' }),
        findMany: jest.fn(),
        update,
      },
    });
    const service = new EmailTemplatesService(prisma);

    await service.update('org-1', 'template-1', { subject: 'New subject' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'template-1' },
      data: { subject: 'New subject' },
    });
  });
});
