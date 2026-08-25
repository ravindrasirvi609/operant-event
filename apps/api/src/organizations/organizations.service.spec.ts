import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '@operant-event/config';
import { OrganizationsService } from './organizations.service';
import { TokenService } from '../common/tokens/token.service';
import type { AuthMailer } from '../auth/auth-mailer.interface';
import type { PrismaService } from '../common/prisma/prisma.service';

const fakeEnv = {
  JWT_ACCESS_SECRET: 'access-secret-for-tests-only-0123456789',
  JWT_REFRESH_SECRET: 'refresh-secret-for-tests-only-0123456789',
  JWT_ACCESS_TTL_SECONDS: 900,
  JWT_REFRESH_TTL_DAYS: 30,
} as Env;

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    organization: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organizationMembership: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: { findUnique: jest.fn(), create: jest.fn() },
    role: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    membershipRole: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    passwordResetToken: { create: jest.fn() },
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

function fakeMailer(): AuthMailer {
  return {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };
}

function buildService(
  prisma: PrismaService,
  mailer: AuthMailer = fakeMailer(),
) {
  const tokenService = new TokenService(fakeEnv, new JwtService());
  return new OrganizationsService(prisma, tokenService, mailer);
}

describe('OrganizationsService.create', () => {
  it('creates the organization, an ACTIVE owner membership, and grants the Owner role', async () => {
    const orgCreate = jest
      .fn()
      .mockResolvedValue({ id: 'org-1', name: 'APTICON', slug: 'apticon' });
    const membershipCreate = jest
      .fn()
      .mockResolvedValue({ id: 'membership-1' });
    const ownerRole = { id: 'role-owner', name: 'Organization Owner' };
    const prisma = fakePrisma({
      organization: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: orgCreate,
      },
      organizationMembership: { create: membershipCreate },
      role: { findFirst: jest.fn().mockResolvedValue(ownerRole) },
    });

    const result = await buildService(prisma).create('user-1', {
      name: 'APTICON',
    });

    expect(result).toEqual({ id: 'org-1', name: 'APTICON', slug: 'apticon' });
    expect(orgCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'APTICON', slug: 'apticon' }),
    });
    expect(membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        userId: 'user-1',
        status: 'ACTIVE',
        joinedAt: expect.any(Date),
        roles: { create: { roleId: 'role-owner' } },
      },
    });
  });

  it('uses the caller-supplied slug instead of deriving one from the name when given', async () => {
    const orgCreate = jest.fn().mockResolvedValue({
      id: 'org-1',
      name: 'APTICON',
      slug: 'apticon-2027',
    });
    const prisma = fakePrisma({
      organization: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: orgCreate,
      },
      role: { findFirst: jest.fn().mockResolvedValue({ id: 'role-owner' }) },
    });

    await buildService(prisma).create('user-1', {
      name: 'APTICON',
      slug: 'APTICON 2027',
    });

    expect(orgCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: 'apticon-2027' }),
    });
  });

  it('throws ConflictException when the slug is already taken', async () => {
    const prisma = fakePrisma({
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-org' }),
      },
    });

    await expect(
      buildService(prisma).create('user-1', { name: 'APTICON' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('OrganizationsService.findMine', () => {
  it('lists only organizations where the caller has an ACTIVE membership', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'org-1', name: 'APTICON', slug: 'apticon' }]);
    const prisma = fakePrisma({ organization: { findMany } });

    const result = await buildService(prisma).findMine('user-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { memberships: { some: { userId: 'user-1', status: 'ACTIVE' } } },
    });
    expect(result).toEqual([{ id: 'org-1', name: 'APTICON', slug: 'apticon' }]);
  });
});

describe('OrganizationsService.update', () => {
  it('updates only the fields provided', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'org-1', website: 'https://apticon.org' });
    const prisma = fakePrisma({ organization: { update } });

    await buildService(prisma).update('org-1', {
      website: 'https://apticon.org',
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: { website: 'https://apticon.org' },
    });
  });
});

describe('OrganizationsService.inviteMember', () => {
  it('creates a membership for an existing user without sending a set-password email', async () => {
    const existingUser = { id: 'user-2', email: 'reviewer@example.com' };
    const membershipCreate = jest
      .fn()
      .mockResolvedValue({ id: 'membership-2' });
    const mailer = fakeMailer();
    const prisma = fakePrisma({
      user: { findUnique: jest.fn().mockResolvedValue(existingUser) },
      organizationMembership: { create: membershipCreate },
    });

    await buildService(prisma, mailer).inviteMember('org-1', {
      email: 'reviewer@example.com',
      firstName: 'Reviewer',
      lastName: 'One',
      roleIds: ['role-reviewer'],
    });

    expect(membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        userId: 'user-2',
        status: 'INVITED',
        roles: { create: [{ roleId: 'role-reviewer' }] },
      },
    });
    expect(mailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('creates a brand-new user with an unusable password and emails a set-password link', async () => {
    const userCreate = jest
      .fn()
      .mockResolvedValue({ id: 'user-3', email: 'new@example.com' });
    const membershipCreate = jest
      .fn()
      .mockResolvedValue({ id: 'membership-3' });
    const tokenCreate = jest.fn().mockResolvedValue(undefined);
    const mailer = fakeMailer();
    const prisma = fakePrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: userCreate,
      },
      organizationMembership: { create: membershipCreate },
      passwordResetToken: { create: tokenCreate },
    });

    await buildService(prisma, mailer).inviteMember('org-1', {
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'Person',
      roleIds: ['role-reviewer'],
    });

    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          status: 'INVITED',
        }),
      }),
    );
    expect(tokenCreate).toHaveBeenCalledTimes(1);
    expect(mailer.sendPasswordReset).toHaveBeenCalledTimes(1);
  });
});

describe('OrganizationsService.updateMembershipStatus', () => {
  it('updates the membership status', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'membership-1', status: 'DEACTIVATED' });
    const prisma = fakePrisma({ organizationMembership: { update } });

    await buildService(prisma).updateMembershipStatus(
      'org-1',
      'membership-1',
      'DEACTIVATED',
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'membership-1', organizationId: 'org-1' },
      data: { status: 'DEACTIVATED' },
    });
  });
});

describe('OrganizationsService.assignMembershipRoles', () => {
  it('replaces the membership role set', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const membershipRoleCreateMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = fakePrisma({
      membershipRole: { deleteMany, createMany: membershipRoleCreateMany },
    });

    await buildService(prisma).assignMembershipRoles('membership-1', [
      'role-a',
      'role-b',
    ]);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { membershipId: 'membership-1' },
    });
    expect(membershipRoleCreateMany).toHaveBeenCalledWith({
      data: [
        { membershipId: 'membership-1', roleId: 'role-a' },
        { membershipId: 'membership-1', roleId: 'role-b' },
      ],
    });
  });
});

describe('OrganizationsService.updateMembership', () => {
  it('only touches status when roleIds is not provided', async () => {
    const membershipUpdate = jest
      .fn()
      .mockResolvedValue({ id: 'membership-1' });
    const roleDeleteMany = jest.fn();
    const prisma = fakePrisma({
      organizationMembership: { update: membershipUpdate },
      membershipRole: { deleteMany: roleDeleteMany },
    });

    await buildService(prisma).updateMembership('org-1', 'membership-1', {
      status: 'ACTIVE',
    });

    expect(membershipUpdate).toHaveBeenCalledWith({
      where: { id: 'membership-1', organizationId: 'org-1' },
      data: { status: 'ACTIVE' },
    });
    expect(roleDeleteMany).not.toHaveBeenCalled();
  });

  it('only touches roles when status is not provided', async () => {
    const membershipUpdate = jest.fn();
    const roleDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const roleCreateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = fakePrisma({
      organizationMembership: { update: membershipUpdate },
      membershipRole: {
        deleteMany: roleDeleteMany,
        createMany: roleCreateMany,
      },
    });

    await buildService(prisma).updateMembership('org-1', 'membership-1', {
      roleIds: ['role-a'],
    });

    expect(membershipUpdate).not.toHaveBeenCalled();
    expect(roleDeleteMany).toHaveBeenCalledWith({
      where: { membershipId: 'membership-1' },
    });
  });
});

describe('OrganizationsService.listRoles', () => {
  it('lists system roles together with the organization’s own custom roles', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'role-owner', organizationId: null }]);
    const prisma = fakePrisma({ role: { findMany } });

    await buildService(prisma).listRoles('org-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { OR: [{ organizationId: null }, { organizationId: 'org-1' }] },
    });
  });
});
