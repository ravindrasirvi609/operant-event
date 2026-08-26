import { PERMISSIONS, type PermissionKey } from './permissions';

/**
 * Groups by the substring before the first '.' — the same module/action
 * split apps/api/src/common/permissions/permissions.catalogue.ts's
 * PERMISSION_CATALOGUE seeds from, so the grouping a user sees in
 * <RoleEditor> maps 1:1 to what the backend actually seeded.
 */
export function groupPermissionsByModule(): Record<string, PermissionKey[]> {
  const groups: Record<string, PermissionKey[]> = {};
  for (const key of Object.values(PERMISSIONS)) {
    const [module] = key.split('.');
    groups[module] ??= [];
    groups[module].push(key);
  }
  return groups;
}
