export interface PermissionRef {
  module: string;
  action: string;
}

export function toPermissionKey(permission: PermissionRef): string {
  return `${permission.module}.${permission.action}`;
}

export function resolveEffectivePermissions(
  permissions: PermissionRef[],
): Set<string> {
  const keys = new Set<string>();
  for (const permission of permissions) {
    keys.add(toPermissionKey(permission));
  }
  return keys;
}

export function hasPermission(
  effective: Set<string>,
  required: string,
): boolean {
  return effective.has(required);
}
