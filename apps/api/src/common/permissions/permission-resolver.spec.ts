import {
  resolveEffectivePermissions,
  hasPermission,
  toPermissionKey,
} from './permission-resolver';

describe('toPermissionKey', () => {
  it('joins module and action with a dot', () => {
    expect(toPermissionKey({ module: 'conference', action: 'create' })).toBe(
      'conference.create',
    );
  });
});

describe('resolveEffectivePermissions', () => {
  it('returns an empty set for no permissions', () => {
    expect(resolveEffectivePermissions([]).size).toBe(0);
  });

  it('includes every permission passed in', () => {
    const effective = resolveEffectivePermissions([
      { module: 'conference', action: 'create' },
      { module: 'conference', action: 'update' },
    ]);
    expect(effective.has('conference.create')).toBe(true);
    expect(effective.has('conference.update')).toBe(true);
  });

  it('de-duplicates the same permission granted by two different roles', () => {
    const effective = resolveEffectivePermissions([
      { module: 'conference', action: 'create' },
      { module: 'conference', action: 'create' },
    ]);
    expect(effective.size).toBe(1);
  });
});

describe('hasPermission', () => {
  it('is true when the permission is in the effective set', () => {
    const effective = resolveEffectivePermissions([
      { module: 'conference', action: 'create' },
    ]);
    expect(hasPermission(effective, 'conference.create')).toBe(true);
  });

  it('is false when the permission is not in the effective set', () => {
    const effective = resolveEffectivePermissions([
      { module: 'conference', action: 'create' },
    ]);
    expect(hasPermission(effective, 'conference.delete')).toBe(false);
  });
});
