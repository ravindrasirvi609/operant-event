import { describe, expect, it } from 'vitest';
import { groupPermissionsByModule } from './group-permissions';
import { PERMISSIONS } from './permissions';

describe('groupPermissionsByModule', () => {
  it('groups every permission under its module prefix (before the dot)', () => {
    const groups = groupPermissionsByModule();

    expect(groups.organization).toEqual(
      expect.arrayContaining([
        PERMISSIONS.ORGANIZATION_UPDATE,
        PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS,
        PERMISSIONS.ORGANIZATION_MANAGE_ROLES,
      ]),
    );
    expect(groups.conference).toEqual(
      expect.arrayContaining([PERMISSIONS.CONFERENCE_CREATE, PERMISSIONS.CONFERENCE_READ, PERMISSIONS.CONFERENCE_UPDATE]),
    );
  });

  it('covers every one of the 23 permission keys exactly once, with none left out', () => {
    const groups = groupPermissionsByModule();

    const allGrouped = Object.values(groups).flat();
    expect(allGrouped).toHaveLength(Object.keys(PERMISSIONS).length);
    expect(new Set(allGrouped).size).toBe(allGrouped.length);
    for (const value of Object.values(PERMISSIONS)) {
      expect(allGrouped).toContain(value);
    }
  });

  it('never produces a module group from a value the backend catalogue does not define', () => {
    const groups = groupPermissionsByModule();

    for (const [module, keys] of Object.entries(groups)) {
      for (const key of keys) {
        expect(key.startsWith(`${module}.`)).toBe(true);
      }
    }
  });
});
