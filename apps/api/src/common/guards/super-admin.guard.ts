import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Platform-level Super Admin gate.
 *
 * Must run after JwtAuthGuard (which populates request.user). Performs a single
 * DB lookup — consistent with the existing PermissionsGuard approach — so that
 * a Super Admin's status is revoked immediately rather than waiting for token expiry.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, SuperAdminGuard)
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });

    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Platform Super Admin access required.');
    }

    return true;
  }
}
