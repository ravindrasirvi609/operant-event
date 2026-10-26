import { SetMetadata } from '@nestjs/common';

export const ALLOW_SUPER_ADMIN_KEY = 'allowSuperAdmin';

export const AllowSuperAdmin = () =>
  SetMetadata(ALLOW_SUPER_ADMIN_KEY, true);