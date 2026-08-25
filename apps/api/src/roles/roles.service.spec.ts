import { BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    permission: { findMany: jest.fn() },
    role: { create: jest.fn() },
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

describe('RolesService.createRole', () => {
  it('creates a custom role scoped to the organization with the resolved permission grants', async () => {
    const permissions = [
      { id: 'perm-1', module: 'conference', action: 'create' },
      { id: 'perm-2', module: 'conference', action: 'read' },
    ];
    const roleCreate = jest
      .fn()
      .mockResolvedValue({ id: 'role-1', name: 'Track Chair' });
    const prisma = fakePrisma({
      permission: { findMany: jest.fn().mockResolvedValue(permissions) },
      role: { create: roleCreate },
    });

    const result = await new RolesService(prisma).createRole('org-1', {
      name: 'Track Chair',
      description: 'Manages one track',
      permissions: ['conference.create', 'conference.read'],
    });

    expect(result).toEqual({ id: 'role-1', name: 'Track Chair' });
    expect(roleCreate).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        name: 'Track Chair',
        description: 'Manages one track',
        isSystem: false,
        permissions: {
          create: [{ permissionId: 'perm-1' }, { permissionId: 'perm-2' }],
        },
      },
    });
  });

  it('rejects a permission key that is not in the catalogue', async () => {
    const prisma = fakePrisma({
      permission: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'perm-1', module: 'conference', action: 'create' },
          ]),
      },
    });

    await expect(
      new RolesService(prisma).createRole('org-1', {
        name: 'Track Chair',
        permissions: ['conference.create', 'conference.made-up-action'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
