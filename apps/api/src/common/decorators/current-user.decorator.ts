import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/authenticated-request';
import type { AuthenticatedUser } from '../types/authenticated-user';

export type { AuthenticatedUser };

/**
 * Populated by JwtAuthGuard/JwtStrategy from the verified access token.
 * Only valid on routes guarded by JwtAuthGuard — that's what guarantees
 * request.user is set before this decorator ever runs.
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as AuthenticatedUser;
  },
);
