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
import {
  hasPermission,
  resolveEffectivePermissions,
} from '../permissions/permission-resolver';
import type { AuthenticatedRequest } from '../types/authenticated-request';

export const ORGANIZATION_HEADER = 'x-organization-id';

/**
 * Resolves the caller's acting organization from the X-Organization-Id
 * header, loads their membership + effective permissions in one query, and
 * (if the handler carries @RequirePermissions) enforces them. Runs after
 * JwtAuthGuard, which is what populates request.user.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[] | undefined>(
      PERMISSIONS_KEY,
      context.getHandler(),
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

    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: {
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
