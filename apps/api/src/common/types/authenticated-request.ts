import type { Request } from 'express';
import type { AuthenticatedUser } from './authenticated-user';

/**
 * The shape of `request` after JwtAuthGuard (populates `user`) and/or
 * PermissionsGuard (populates `organizationId`/`effectivePermissions`) have
 * run. All three fields are optional because not every guarded route runs
 * both guards.
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  organizationId?: string;
  effectivePermissions?: Set<string>;
}
