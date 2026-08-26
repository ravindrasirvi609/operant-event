import { describe, expect, it } from 'vitest';
import { hasPermission, PERMISSIONS } from './permissions';

describe('PERMISSIONS', () => {
  it('has exactly the 23 keys the backend catalogue defines', () => {
    expect(Object.keys(PERMISSIONS)).toHaveLength(23);
  });

  it('matches the backend string values for a representative sample', () => {
    expect(PERMISSIONS.CONFERENCE_CREATE).toBe('conference.create');
    expect(PERMISSIONS.ABSTRACT_OVERRIDE_DEADLINE).toBe('abstract.override_deadline');
    expect(PERMISSIONS.PAYMENT_REFUND).toBe('payment.refund');
    expect(PERMISSIONS.EMAIL_TEMPLATE_MANAGE).toBe('email_template.manage');
    expect(PERMISSIONS.EXPORT_MANAGE).toBe('export.manage');
    expect(PERMISSIONS.IMPORT_MANAGE).toBe('import.manage');
  });
});

describe('hasPermission', () => {
  it('returns true when the key is present in the effective permission list', () => {
    expect(hasPermission([PERMISSIONS.CONFERENCE_CREATE], PERMISSIONS.CONFERENCE_CREATE)).toBe(true);
  });

  it('returns false when the key is absent', () => {
    expect(hasPermission([PERMISSIONS.CONFERENCE_READ], PERMISSIONS.CONFERENCE_CREATE)).toBe(false);
  });

  it('returns false for an empty permission list', () => {
    expect(hasPermission([], PERMISSIONS.CONFERENCE_CREATE)).toBe(false);
  });
});
