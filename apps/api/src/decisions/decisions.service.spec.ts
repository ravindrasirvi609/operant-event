import { NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { DecisionsService } from './decisions.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    abstract: { findFirst: jest.fn(), update: jest.fn() },
    abstractDecision: { create: jest.fn() },
    abstractRevisionRequest: { create: jest.fn() },
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

function fakeEventEmitter(): EventEmitter2 {
  return { emit: jest.fn() } as unknown as EventEmitter2;
}

const abstractInOrg = {
  id: 'abs-1',
  conferenceId: 'conf-1',
  currentVersionId: 'version-3',
  submittedBy: 'author-1',
  title: 'A Study',
};

describe('DecisionsService.recordDecision', () => {
  it('rejects an abstract outside the caller organization', async () => {
    const prisma = fakePrisma({
      abstract: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new DecisionsService(prisma, fakeEventEmitter()).recordDecision(
        'org-1',
        'abs-x',
        'user-1',
        {
          decision: 'ACCEPTED',
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records the decision referencing the effective version and updates the abstract status', async () => {
    const decisionCreate = jest.fn().mockResolvedValue({ id: 'decision-1' });
    const abstractUpdate = jest
      .fn()
      .mockResolvedValue({ id: 'abs-1', status: 'ACCEPTED' });
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(abstractInOrg),
        update: abstractUpdate,
      },
      abstractDecision: { create: decisionCreate },
    });

    await new DecisionsService(prisma, fakeEventEmitter()).recordDecision(
      'org-1',
      'abs-1',
      'chair-1',
      {
        decision: 'ACCEPTED',
        reason: 'Strong methodology',
      },
    );

    expect(decisionCreate).toHaveBeenCalledWith({
      data: {
        abstractId: 'abs-1',
        decision: 'ACCEPTED',
        reason: 'Strong methodology',
        decidedBy: 'chair-1',
        effectiveVersionId: 'version-3',
      },
    });
    expect(abstractUpdate).toHaveBeenCalledWith({
      where: { id: 'abs-1' },
      data: { status: 'ACCEPTED' },
    });
  });

  it('never derives the decision from any Review row — it always takes the caller-supplied decision verbatim', async () => {
    const abstractUpdate = jest
      .fn()
      .mockResolvedValue({ id: 'abs-1', status: 'WAITLISTED' });
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(abstractInOrg),
        update: abstractUpdate,
      },
      abstractDecision: {
        create: jest.fn().mockResolvedValue({ id: 'decision-1' }),
      },
    });

    await new DecisionsService(prisma, fakeEventEmitter()).recordDecision(
      'org-1',
      'abs-1',
      'chair-1',
      { decision: 'WAITLISTED' },
    );

    expect(abstractUpdate).toHaveBeenCalledWith({
      where: { id: 'abs-1' },
      data: { status: 'WAITLISTED' },
    });
  });

  it('emits abstract.accepted when the decision is ACCEPTED', async () => {
    const eventEmitter = fakeEventEmitter();
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(abstractInOrg),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'abs-1', status: 'ACCEPTED' }),
      },
      abstractDecision: {
        create: jest.fn().mockResolvedValue({ id: 'decision-1' }),
      },
    });

    await new DecisionsService(prisma, eventEmitter).recordDecision(
      'org-1',
      'abs-1',
      'chair-1',
      {
        decision: 'ACCEPTED',
      },
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith('abstract.accepted', {
      organizationId: 'org-1',
      conferenceId: 'conf-1',
      userId: 'author-1',
      templateData: { abstractTitle: 'A Study' },
    });
  });

  it('does not emit abstract.accepted for any other decision', async () => {
    const eventEmitter = fakeEventEmitter();
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(abstractInOrg),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'abs-1', status: 'REJECTED' }),
      },
      abstractDecision: {
        create: jest.fn().mockResolvedValue({ id: 'decision-1' }),
      },
    });

    await new DecisionsService(prisma, eventEmitter).recordDecision(
      'org-1',
      'abs-1',
      'chair-1',
      {
        decision: 'REJECTED',
      },
    );

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});

describe('DecisionsService.requestRevision', () => {
  it('creates a revision request and moves the abstract to REVISION_REQUIRED', async () => {
    const revisionCreate = jest.fn().mockResolvedValue({ id: 'revision-1' });
    const abstractUpdate = jest
      .fn()
      .mockResolvedValue({ id: 'abs-1', status: 'REVISION_REQUIRED' });
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(abstractInOrg),
        update: abstractUpdate,
      },
      abstractRevisionRequest: { create: revisionCreate },
    });

    await new DecisionsService(prisma, fakeEventEmitter()).requestRevision(
      'org-1',
      'abs-1',
      'chair-1',
      {
        reason: 'Please revise the methodology section.',
      },
    );

    expect(revisionCreate).toHaveBeenCalledWith({
      data: {
        abstractId: 'abs-1',
        requestedBy: 'chair-1',
        reason: 'Please revise the methodology section.',
        dueDate: undefined,
      },
    });
    expect(abstractUpdate).toHaveBeenCalledWith({
      where: { id: 'abs-1' },
      data: { status: 'REVISION_REQUIRED' },
    });
  });

  it('emits abstract.revision_required with the reason as template data', async () => {
    const eventEmitter = fakeEventEmitter();
    const prisma = fakePrisma({
      abstract: {
        findFirst: jest.fn().mockResolvedValue(abstractInOrg),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'abs-1', status: 'REVISION_REQUIRED' }),
      },
      abstractRevisionRequest: {
        create: jest.fn().mockResolvedValue({ id: 'revision-1' }),
      },
    });

    await new DecisionsService(prisma, eventEmitter).requestRevision(
      'org-1',
      'abs-1',
      'chair-1',
      {
        reason: 'Please revise the methodology section.',
      },
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'abstract.revision_required',
      {
        organizationId: 'org-1',
        conferenceId: 'conf-1',
        userId: 'author-1',
        templateData: {
          abstractTitle: 'A Study',
          reason: 'Please revise the methodology section.',
        },
      },
    );
  });
});
