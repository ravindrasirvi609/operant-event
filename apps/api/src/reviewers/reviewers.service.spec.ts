import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReviewersService } from './reviewers.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    reviewer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    reviewerProfile: { upsert: jest.fn() },
    user: { findUnique: jest.fn() },
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

describe('ReviewersService.addReviewer', () => {
  it('rejects adding the same user as a reviewer twice in one organization', async () => {
    const prisma = fakePrisma({
      reviewer: { findUnique: jest.fn().mockResolvedValue({ id: 'existing' }) },
    });

    await expect(
      new ReviewersService(prisma).addReviewer('org-1', { userId: 'user-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates an ACTIVE reviewer scoped to the organization', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'reviewer-1' });
    const prisma = fakePrisma({
      reviewer: { findUnique: jest.fn().mockResolvedValue(null), create },
    });

    await new ReviewersService(prisma).addReviewer('org-1', {
      userId: 'user-1',
    });

    expect(create).toHaveBeenCalledWith({
      data: { organizationId: 'org-1', userId: 'user-1', status: 'ACTIVE' },
    });
  });

  it('resolves the user by email when userId is not given', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'reviewer-1' });
    const prisma = fakePrisma({
      reviewer: { findUnique: jest.fn().mockResolvedValue(null), create },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-2', email: 'reviewer@example.com' }),
      },
    });

    await new ReviewersService(prisma).addReviewer('org-1', {
      email: 'reviewer@example.com',
    });

    expect(create).toHaveBeenCalledWith({
      data: { organizationId: 'org-1', userId: 'user-2', status: 'ACTIVE' },
    });
  });

  it('throws NotFoundException when the given email matches no user', async () => {
    const prisma = fakePrisma({
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new ReviewersService(prisma).addReviewer('org-1', {
        email: 'nobody@example.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ReviewersService.updateProfile', () => {
  it('rejects a reviewer outside the caller organization', async () => {
    const prisma = fakePrisma({
      reviewer: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new ReviewersService(prisma).updateProfile('org-1', 'reviewer-x', {
        institution: 'AIIMS',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('upserts the profile once tenancy is confirmed', async () => {
    const upsert = jest
      .fn()
      .mockResolvedValue({ reviewerId: 'reviewer-1', institution: 'AIIMS' });
    const prisma = fakePrisma({
      reviewer: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'reviewer-1', organizationId: 'org-1' }),
      },
      reviewerProfile: { upsert },
    });

    await new ReviewersService(prisma).updateProfile('org-1', 'reviewer-1', {
      institution: 'AIIMS',
      keywords: ['oncology'],
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { reviewerId: 'reviewer-1' },
      update: { institution: 'AIIMS', keywords: ['oncology'] },
      create: {
        reviewerId: 'reviewer-1',
        institution: 'AIIMS',
        keywords: ['oncology'],
      },
    });
  });
});

describe('ReviewersService.findAll', () => {
  it('lists reviewers scoped to the organization with their profiles', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({ reviewer: { findMany } });

    await new ReviewersService(prisma).findAll('org-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      include: { profile: true },
    });
  });
});
