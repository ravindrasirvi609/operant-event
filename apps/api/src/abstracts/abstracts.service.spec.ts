import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AbstractsService } from './abstracts.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    conference: { findUnique: jest.fn(), findFirst: jest.fn() },
    conferenceSetting: { findUnique: jest.fn() },
    conferenceFormField: { findMany: jest.fn().mockResolvedValue([]) },
    abstract: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    abstractVersion: { create: jest.fn(), findFirst: jest.fn() },
    author: { findFirst: jest.fn(), create: jest.fn() },
    abstractAuthor: { deleteMany: jest.fn(), createMany: jest.fn() },
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

const titleField = {
  fieldKey: 'title',
  label: 'Background',
  fieldType: 'LONG_TEXT',
  isRequired: true,
  status: 'ACTIVE',
  optionsJson: null,
};

describe('AbstractsService.createDraft', () => {
  it('throws NotFoundException when the conference does not exist', async () => {
    const prisma = fakePrisma({
      conference: { findUnique: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new AbstractsService(prisma).createDraft('conf-x', 'user-1', {
        title: 'A study',
        submissionType: 'ORAL',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a DRAFT abstract owned by the caller', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'abs-1', status: 'DRAFT' });
    const prisma = fakePrisma({
      conference: { findUnique: jest.fn().mockResolvedValue({ id: 'conf-1' }) },
      abstract: { create, count: jest.fn().mockResolvedValue(0) },
    });

    await new AbstractsService(prisma).createDraft('conf-1', 'user-1', {
      title: 'A study',
      submissionType: 'ORAL',
      trackId: 'track-1',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        conferenceId: 'conf-1',
        trackId: 'track-1',
        title: 'A study',
        submissionType: 'ORAL',
        presentationPreference: undefined,
        status: 'DRAFT',
        submittedBy: 'user-1',
      },
    });
  });
});

describe('AbstractsService.findAllForOrganizer', () => {
  it('rejects a conference outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new AbstractsService(prisma).findAllForOrganizer('org-1', 'conf-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists abstracts scoped to the conference once tenancy is confirmed', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({
      conference: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'conf-1', organizationId: 'org-1' }),
      },
      abstract: { findMany },
    });

    await new AbstractsService(prisma).findAllForOrganizer('org-1', 'conf-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { conferenceId: 'conf-1' },
    });
  });
});

describe('AbstractsService.saveVersion', () => {
  const draftAbstract = {
    id: 'abs-1',
    conferenceId: 'conf-1',
    submittedBy: 'user-1',
    status: 'DRAFT',
  };

  it('rejects when the caller does not own the abstract', async () => {
    const prisma = fakePrisma({
      abstract: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new AbstractsService(prisma).saveVersion('someone-else', 'abs-1', {
        formData: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects editing an abstract that is no longer editable', async () => {
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ ...draftAbstract, status: 'ACCEPTED' }),
      },
    });

    await expect(
      new AbstractsService(prisma).saveVersion('user-1', 'abs-1', {
        formData: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid form data without requiring every field (draft save)', async () => {
    const prisma = fakePrisma({
      abstract: { findFirst: jest.fn().mockResolvedValue(draftAbstract) },
      conferenceFormField: {
        findMany: jest.fn().mockResolvedValue([titleField]),
      },
    });

    await expect(
      new AbstractsService(prisma).saveVersion('user-1', 'abs-1', {
        formData: { background: 42 }, // wrong type, but "background" isn't even a known key here
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates version 1 and updates the abstract on the first save', async () => {
    const versionCreate = jest
      .fn()
      .mockResolvedValue({ id: 'version-1', versionNumber: 1 });
    const abstractUpdate = jest.fn().mockResolvedValue({ id: 'abs-1' });
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(draftAbstract),
        update: abstractUpdate,
      },
      abstractVersion: {
        create: versionCreate,
        findFirst: jest.fn().mockResolvedValue(null),
      },
      conferenceFormField: {
        findMany: jest.fn().mockResolvedValue([titleField]),
      },
    });

    await new AbstractsService(prisma).saveVersion('user-1', 'abs-1', {
      title: 'Updated title',
      formData: { title: 'Some background text' },
    });

    expect(versionCreate).toHaveBeenCalledWith({
      data: {
        abstractId: 'abs-1',
        versionNumber: 1,
        formData: { title: 'Some background text' },
        submittedBy: 'user-1',
      },
    });
    expect(abstractUpdate).toHaveBeenCalledWith({
      where: { id: 'abs-1' },
      data: expect.objectContaining({
        title: 'Updated title',
        currentVersionId: 'version-1',
      }),
    });
  });

  it('creates version 2 (never overwrites version 1) on a second save', async () => {
    const versionCreate = jest
      .fn()
      .mockResolvedValue({ id: 'version-2', versionNumber: 2 });
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(draftAbstract),
        update: jest.fn(),
      },
      abstractVersion: {
        create: versionCreate,
        findFirst: jest.fn().mockResolvedValue({ versionNumber: 1 }),
      },
      conferenceFormField: {
        findMany: jest.fn().mockResolvedValue([titleField]),
      },
    });

    await new AbstractsService(prisma).saveVersion('user-1', 'abs-1', {
      formData: { title: 'Revised background text' },
    });

    expect(versionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ versionNumber: 2 }),
      }),
    );
  });
});

describe('AbstractsService.submit', () => {
  const draftAbstract = {
    id: 'abs-1',
    conferenceId: 'conf-1',
    submittedBy: 'user-1',
    status: 'DRAFT',
    currentVersionId: 'version-1',
  };

  it('resubmits a REVISION_REQUIRED abstract as RESUBMITTED, keeping its existing submission number', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'abs-1', status: 'RESUBMITTED' });
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ ...draftAbstract, status: 'REVISION_REQUIRED' }),
        update,
      },
      abstractVersion: {
        findFirst: jest.fn().mockResolvedValue({ formData: { title: 'x' } }),
      },
      conferenceSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      conferenceFormField: {
        findMany: jest.fn().mockResolvedValue([titleField]),
      },
    });

    await new AbstractsService(prisma).submit('user-1', 'abs-1', false);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'abs-1' },
      data: { status: 'RESUBMITTED', submittedAt: expect.any(Date) },
    });
  });

  it('rejects submitting an abstract with no saved version yet', async () => {
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ ...draftAbstract, currentVersionId: null }),
      },
    });

    await expect(
      new AbstractsService(prisma).submit('user-1', 'abs-1', false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects submitting after the abstract deadline without an override', async () => {
    const prisma = fakePrisma({
      abstract: { findFirst: jest.fn().mockResolvedValue(draftAbstract) },
      abstractVersion: {
        findFirst: jest.fn().mockResolvedValue({ formData: { title: 'x' } }),
      },
      conferenceSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ abstractEndDate: new Date('2000-01-01') }),
      },
      conferenceFormField: {
        findMany: jest.fn().mockResolvedValue([titleField]),
      },
    });

    await expect(
      new AbstractsService(prisma).submit('user-1', 'abs-1', false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows submitting after the deadline when the caller has the override permission', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'abs-1', status: 'SUBMITTED' });
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(draftAbstract),
        update,
      },
      abstractVersion: {
        findFirst: jest.fn().mockResolvedValue({ formData: { title: 'x' } }),
      },
      conferenceSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ abstractEndDate: new Date('2000-01-01') }),
      },
      conferenceFormField: {
        findMany: jest.fn().mockResolvedValue([titleField]),
      },
    });

    await new AbstractsService(prisma).submit('user-1', 'abs-1', true);

    expect(update).toHaveBeenCalled();
  });

  it('rejects submitting when the current version fails full form validation', async () => {
    const prisma = fakePrisma({
      abstract: { findFirst: jest.fn().mockResolvedValue(draftAbstract) },
      abstractVersion: {
        findFirst: jest.fn().mockResolvedValue({ formData: {} }),
      },
      conferenceSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      conferenceFormField: {
        findMany: jest.fn().mockResolvedValue([titleField]),
      },
    });

    await expect(
      new AbstractsService(prisma).submit('user-1', 'abs-1', false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assigns a submission number and marks the abstract SUBMITTED', async () => {
    const update = jest.fn().mockResolvedValue({
      id: 'abs-1',
      status: 'SUBMITTED',
      submissionNumber: 'A-000001',
    });
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(draftAbstract),
        update,
        count: jest.fn().mockResolvedValue(0),
      },
      abstractVersion: {
        findFirst: jest.fn().mockResolvedValue({ formData: { title: 'x' } }),
      },
      conferenceSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      conferenceFormField: {
        findMany: jest.fn().mockResolvedValue([titleField]),
      },
    });

    await new AbstractsService(prisma).submit('user-1', 'abs-1', false);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'abs-1' },
      data: {
        status: 'SUBMITTED',
        submittedAt: expect.any(Date),
        submissionNumber: 'A-000001',
      },
    });
  });

  it('retries with the next sequence number when the first candidate collides', async () => {
    const update = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({ id: 'abs-1', status: 'SUBMITTED' });
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(draftAbstract),
        update,
        count: jest.fn().mockResolvedValue(0),
      },
      abstractVersion: {
        findFirst: jest.fn().mockResolvedValue({ formData: { title: 'x' } }),
      },
      conferenceSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      conferenceFormField: {
        findMany: jest.fn().mockResolvedValue([titleField]),
      },
    });

    await new AbstractsService(prisma).submit('user-1', 'abs-1', false);

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[0][0].data.submissionNumber).toBe('A-000001');
    expect(update.mock.calls[1][0].data.submissionNumber).toBe('A-000002');
  });
});

describe('AbstractsService.forceSubmit', () => {
  it('rejects a conference outside the caller organization', async () => {
    const prisma = fakePrisma({
      conference: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new AbstractsService(prisma).forceSubmit('org-1', 'conf-x', 'abs-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('submits past the deadline on the organizer’s behalf, bypassing ownership and the deadline check', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'abs-1', status: 'SUBMITTED' });
    const prisma = fakePrisma({
      conference: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'conf-1', organizationId: 'org-1' }),
      },
      abstract: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'abs-1',
          conferenceId: 'conf-1',
          status: 'DRAFT',
          currentVersionId: 'v1',
        }),
        update,
        count: jest.fn().mockResolvedValue(0),
      },
      abstractVersion: {
        findFirst: jest.fn().mockResolvedValue({ formData: { title: 'x' } }),
      },
      conferenceFormField: {
        findMany: jest.fn().mockResolvedValue([titleField]),
      },
    });

    await new AbstractsService(prisma).forceSubmit('org-1', 'conf-1', 'abs-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'abs-1' },
      data: {
        status: 'SUBMITTED',
        submittedAt: expect.any(Date),
        submissionNumber: 'A-000001',
      },
    });
  });
});

describe('AbstractsService.withdraw', () => {
  it('withdraws an abstract in an eligible status', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'abs-1', status: 'WITHDRAWN' });
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'abs-1',
          submittedBy: 'user-1',
          status: 'UNDER_REVIEW',
        }),
        update,
      },
    });

    await new AbstractsService(prisma).withdraw('user-1', 'abs-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'abs-1' },
      data: { status: 'WITHDRAWN' },
    });
  });

  it('rejects withdrawing an abstract that has already been accepted', async () => {
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'abs-1',
          submittedBy: 'user-1',
          status: 'ACCEPTED',
        }),
      },
    });

    await expect(
      new AbstractsService(prisma).withdraw('user-1', 'abs-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AbstractsService.setAuthors', () => {
  const abstract = { id: 'abs-1', submittedBy: 'user-1' };
  const validAuthors = [
    {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      isPresenting: true,
    },
    { firstName: 'Alan', lastName: 'Turing' },
  ];

  it('rejects an invalid author-flag combination before touching the database', async () => {
    const prisma = fakePrisma({
      abstract: { findFirst: jest.fn().mockResolvedValue(abstract) },
    });

    await expect(
      new AbstractsService(prisma).setAuthors('user-1', 'abs-1', [
        { firstName: 'Ada', lastName: 'Lovelace' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reuses an existing Author by email and creates a new one otherwise', async () => {
    const authorFindFirst = jest
      .fn()
      .mockResolvedValue({ id: 'author-existing' });
    const authorCreate = jest.fn().mockResolvedValue({ id: 'author-new' });
    const deleteMany = jest.fn();
    const createMany = jest.fn();
    const prisma = fakePrisma({
      abstract: { findFirst: jest.fn().mockResolvedValue(abstract) },
      author: { findFirst: authorFindFirst, create: authorCreate },
      abstractAuthor: { deleteMany, createMany },
    });

    await new AbstractsService(prisma).setAuthors(
      'user-1',
      'abs-1',
      validAuthors,
    );

    expect(authorFindFirst).toHaveBeenCalledWith({
      where: { email: 'ada@example.com' },
    });
    expect(authorCreate).toHaveBeenCalledTimes(1); // Alan has no email, always created fresh
    expect(deleteMany).toHaveBeenCalledWith({ where: { abstractId: 'abs-1' } });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          abstractId: 'abs-1',
          authorId: 'author-existing',
          authorOrder: 0,
          isCorresponding: false,
          isPresenting: true,
        },
        {
          abstractId: 'abs-1',
          authorId: 'author-new',
          authorOrder: 1,
          isCorresponding: false,
          isPresenting: false,
        },
      ],
    });
  });

  it('throws NotFoundException when the caller does not own the abstract', async () => {
    const prisma = fakePrisma({
      abstract: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new AbstractsService(prisma).setAuthors(
        'someone-else',
        'abs-1',
        validAuthors,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
