import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConferenceFormFieldsService } from './conference-form-fields.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findFirst: jest.fn() },
    conferenceFormField: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

const inOrg = { id: 'conf-1', organizationId: 'org-1' };

describe('ConferenceFormFieldsService.create', () => {
  it('rejects a conference outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new ConferenceFormFieldsService(prisma).create('org-1', 'conf-x', {
        section: 'Content',
        fieldKey: 'title',
        label: 'Title',
        fieldType: 'TEXT',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a duplicate fieldKey within the same conference', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(inOrg) },
      conferenceFormField: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing' }),
      },
    });

    await expect(
      new ConferenceFormFieldsService(prisma).create('org-1', 'conf-1', {
        section: 'Content',
        fieldKey: 'title',
        label: 'Title',
        fieldType: 'TEXT',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('appends the field at the next sortOrder', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'field-3' });
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(inOrg) },
      conferenceFormField: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(2),
        create,
      },
    });

    await new ConferenceFormFieldsService(prisma).create('org-1', 'conf-1', {
      section: 'Content',
      fieldKey: 'keywords',
      label: 'Keywords',
      fieldType: 'MULTI_SELECT',
      isRequired: true,
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        section: 'Content',
        fieldKey: 'keywords',
        label: 'Keywords',
        fieldType: 'MULTI_SELECT',
        isRequired: true,
        optionsJson: undefined,
        validationJson: undefined,
        sortOrder: 2,
      },
    });
  });
});

describe('ConferenceFormFieldsService.findActive', () => {
  it('lists only ACTIVE fields ordered by sortOrder', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(inOrg) },
      conferenceFormField: { findMany },
    });

    await new ConferenceFormFieldsService(prisma).findActive('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1', status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
    });
  });
});

describe('ConferenceFormFieldsService.update', () => {
  it('never deletes — disabling is a status update, not a removal', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'field-1', status: 'DISABLED' });
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(inOrg) },
      conferenceFormField: { update },
    });

    await new ConferenceFormFieldsService(prisma).update(
      'org-1',
      'conf-1',
      'field-1',
      {
        status: 'DISABLED',
      },
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'field-1', conferenceId: 'conf-1' },
      data: { status: 'DISABLED' },
    });
  });
});
