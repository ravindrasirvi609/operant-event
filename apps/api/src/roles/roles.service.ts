import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { toPermissionKey } from '../common/permissions/permission-resolver';
import type { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(organizationId: string, dto: CreateRoleDto) {
    const permissions = await this.prisma.permission.findMany({
      where: {
        OR: dto.permissions.map((key) => {
          const [module, action] = key.split('.');
          return { module, action };
        }),
      },
    });

    const foundKeys = new Set(
      permissions.map((permission) => toPermissionKey(permission)),
    );
    const unknown = dto.permissions.filter((key) => !foundKeys.has(key));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown permission(s): ${unknown.join(', ')}`,
      );
    }

    return this.prisma.role.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        isSystem: false,
        permissions: {
          create: permissions.map((permission) => ({
            permissionId: permission.id,
          })),
        },
      },
    });
  }
}
