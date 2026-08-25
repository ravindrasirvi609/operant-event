import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Populated by PermissionsGuard after resolving the caller's active
 * membership. Only valid on routes guarded by PermissionsGuard.
 */
export const CurrentOrganizationId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.organizationId as string;
  },
);
