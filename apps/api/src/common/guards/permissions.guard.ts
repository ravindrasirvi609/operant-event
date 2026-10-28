
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { ALLOW_SUPER_ADMIN_KEY } from '../decorators/allow-super-admin.decorator';
import {
  hasPermission,
  resolveEffectivePermissions,
} from '../permissions/permission-resolver';
import type { AuthenticatedRequest } from '../types/authenticated-request';

export const ORGANIZATION_HEADER = 'x-organization-id';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
const controller = context.getClass();

const requiredPermissions = this.reflector.getAllAndOverride<
  string[] | undefined
>(PERMISSIONS_KEY, [handler, controller]);

const allowSuperAdmin = this.reflector.getAllAndOverride<boolean>(
  ALLOW_SUPER_ADMIN_KEY,
  [handler, controller],
);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authentication required.');
    }

    const organizationHeader = request.headers[ORGANIZATION_HEADER];

    if (!organizationHeader || typeof organizationHeader !== 'string') {
      throw new ForbiddenException(`Missing ${ORGANIZATION_HEADER} header.`);
    }

    const organizationId = organizationHeader;

    // Explicitly marked endpoints may allow a verified platform Super Admin.
    if (allowSuperAdmin) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { isSuperAdmin: true },
      });

      if (user?.isSuperAdmin) {
        const organization = await this.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { status: true },
        });

        if (!organization || organization.status !== 'ACTIVE') {
          throw new ForbiddenException(
            'This organization does not exist or is not active.',
          );
        }

        request.organizationId = organizationId;
        request.effectivePermissions = new Set<string>();

        return true;
      }
    }

    // Normal users must still have an active membership.
    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      include: {
        organization: { select: { status: true } },
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'You are not an active member of this organization.',
      );
    }

    if (membership.organization.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'This organization is not active. Contact your platform administrator.',
      );
    }

    const permissionRefs = membership.roles.flatMap((membershipRole) =>
      membershipRole.role.permissions.map(
        (rolePermission) => rolePermission.permission,
      ),
    );

    const effectivePermissions = resolveEffectivePermissions(permissionRefs);

    request.organizationId = organizationId;
    request.effectivePermissions = effectivePermissions;

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const missing = requiredPermissions.filter(
      (permission) => !hasPermission(effectivePermissions, permission),
    );

    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing required permission(s): ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
