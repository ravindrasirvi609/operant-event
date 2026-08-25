import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard, ORGANIZATION_HEADER } from './permissions.guard';
import type { PrismaService } from '../prisma/prisma.service';

function buildGuard(
  prisma: PrismaService,
  request: Record<string, unknown>,
  requiredPermissions?: string[],
) {
  const reflector = {
    get: jest.fn().mockReturnValue(requiredPermissions),
  } as unknown as Reflector;
  const context = {
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const guard = new PermissionsGuard(reflector, prisma);
  return { guard, context };
}

function fakePrisma(findUnique: jest.Mock) {
  return { organizationMembership: { findUnique } } as unknown as PrismaService;
}

function activeMembershipWithPermissions(
  ...permissions: Array<{ module: string; action: string }>
) {
  return {
    status: 'ACTIVE',
    roles: [
      {
        role: {
          permissions: permissions.map((permission) => ({ permission })),
        },
      },
    ],
  };
}

describe('PermissionsGuard', () => {
  it('throws UnauthorizedException when there is no authenticated user', async () => {
    const { guard, context } = buildGuard(fakePrisma(jest.fn()), {
      headers: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException when the X-Organization-Id header is missing', async () => {
    const { guard, context } = buildGuard(fakePrisma(jest.fn()), {
      headers: {},
      user: { id: 'user-1' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when the caller has no membership in that organization', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const { guard, context } = buildGuard(fakePrisma(findUnique), {
      headers: { [ORGANIZATION_HEADER]: 'org-1' },
      user: { id: 'user-1' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_userId: { organizationId: 'org-1', userId: 'user-1' },
      },
      include: expect.anything(),
    });
  });

  it('throws ForbiddenException when the membership is deactivated', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...activeMembershipWithPermissions(),
      status: 'DEACTIVATED',
    });
    const { guard, context } = buildGuard(fakePrisma(findUnique), {
      headers: { [ORGANIZATION_HEADER]: 'org-1' },
      user: { id: 'user-1' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows the request through and attaches organization context when no permission is required', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(activeMembershipWithPermissions());
    const request: Record<string, unknown> = {
      headers: { [ORGANIZATION_HEADER]: 'org-1' },
      user: { id: 'user-1' },
    };
    const { guard, context } = buildGuard(fakePrisma(findUnique), request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.organizationId).toBe('org-1');
    expect(request.effectivePermissions).toBeInstanceOf(Set);
  });

  it('allows the request through when the caller holds the required permission', async () => {
    const findUnique = jest.fn().mockResolvedValue(
      activeMembershipWithPermissions({
        module: 'conference',
        action: 'create',
      }),
    );
    const { guard, context } = buildGuard(
      fakePrisma(findUnique),
      { headers: { [ORGANIZATION_HEADER]: 'org-1' }, user: { id: 'user-1' } },
      ['conference.create'],
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('throws ForbiddenException naming the missing permission when the caller lacks it', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(activeMembershipWithPermissions());
    const { guard, context } = buildGuard(
      fakePrisma(findUnique),
      { headers: { [ORGANIZATION_HEADER]: 'org-1' }, user: { id: 'user-1' } },
      ['conference.create'],
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      /conference\.create/,
    );
  });
});
