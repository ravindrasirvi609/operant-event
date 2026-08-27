import { BadRequestException } from '@nestjs/common';

/**
 * `PermissionsGuard` resolves and permission-checks the acting
 * organization strictly from the `X-Organization-Id` header. Several
 * routes also take an organization id as a path param for the URL shape
 * — without this check, a caller could pass a permission check against
 * org A (via the header) while the path param silently points the
 * service call at org B.
 */
export function assertMatchingOrganizationId(
  pathOrganizationId: string,
  headerOrganizationId: string,
): void {
  if (pathOrganizationId !== headerOrganizationId) {
    throw new BadRequestException(
      'Path organization id does not match the X-Organization-Id header.',
    );
  }
}
