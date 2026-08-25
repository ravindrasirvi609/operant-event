import { NotFoundException } from '@nestjs/common';
import { ConflictOfInterestService } from './conflict-of-interest.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    reviewer: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    abstractAuthor: { findMany: jest.fn().mockResolvedValue([]) },
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

const reviewer = {
  id: 'reviewer-1',
  userId: 'user-1',
  profile: { institution: 'AIIMS Delhi' },
};

describe('ConflictOfInterestService.check', () => {
  it('throws NotFoundException for an unknown reviewer', async () => {
    const prisma = fakePrisma({
      reviewer: { findUnique: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new ConflictOfInterestService(prisma).check('reviewer-x', 'abs-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reports no conflict when the reviewer shares no institution or authorship with the abstract', async () => {
    const prisma = fakePrisma({
      reviewer: { findUnique: jest.fn().mockResolvedValue(reviewer) },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', email: 'reviewer@example.com' }),
      },
      abstractAuthor: {
        findMany: jest.fn().mockResolvedValue([
          {
            author: {
              email: 'author@example.com',
              institution: 'Other Institute',
            },
          },
        ]),
      },
    });

    const result = await new ConflictOfInterestService(prisma).check(
      'reviewer-1',
      'abs-1',
    );

    expect(result).toEqual({ hasConflict: false, reasons: [] });
  });

  it('flags a conflict when the reviewer is also a co-author on the abstract', async () => {
    const prisma = fakePrisma({
      reviewer: { findUnique: jest.fn().mockResolvedValue(reviewer) },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', email: 'reviewer@example.com' }),
      },
      abstractAuthor: {
        findMany: jest.fn().mockResolvedValue([
          {
            author: {
              email: 'reviewer@example.com',
              institution: 'Other Institute',
            },
          },
        ]),
      },
    });

    const result = await new ConflictOfInterestService(prisma).check(
      'reviewer-1',
      'abs-1',
    );

    expect(result.hasConflict).toBe(true);
    expect(result.reasons).toContain(
      'Reviewer is a co-author on this abstract.',
    );
  });

  it('flags a conflict when the reviewer shares an institution with a co-author', async () => {
    const prisma = fakePrisma({
      reviewer: { findUnique: jest.fn().mockResolvedValue(reviewer) },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', email: 'reviewer@example.com' }),
      },
      abstractAuthor: {
        findMany: jest.fn().mockResolvedValue([
          {
            author: {
              email: 'someone@example.com',
              institution: 'AIIMS Delhi',
            },
          },
        ]),
      },
    });

    const result = await new ConflictOfInterestService(prisma).check(
      'reviewer-1',
      'abs-1',
    );

    expect(result.hasConflict).toBe(true);
    expect(result.reasons).toContain(
      'Reviewer shares an institution with a co-author on this abstract.',
    );
  });
});
