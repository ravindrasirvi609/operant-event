import { describe, expect, it } from 'vitest';
import { notificationEntityRoute } from './entity-route';

describe('notificationEntityRoute', () => {
  it('returns null when entityType is missing', () => {
    expect(notificationEntityRoute({ entityType: null, entityId: 'abc' })).toBeNull();
  });

  it('returns null when entityId is missing', () => {
    expect(notificationEntityRoute({ entityType: 'abstract', entityId: null })).toBeNull();
  });

  it('maps an abstract to its author-facing detail page', () => {
    expect(notificationEntityRoute({ entityType: 'abstract', entityId: 'abs-1' })).toBe('/my-abstracts/abs-1');
  });

  it('maps a reviewAssignment to its reviewer-facing detail page', () => {
    expect(notificationEntityRoute({ entityType: 'reviewAssignment', entityId: 'assignment-1' })).toBe(
      '/my-reviews/assignment-1',
    );
  });

  it('maps an order to its detail page', () => {
    expect(notificationEntityRoute({ entityType: 'order', entityId: 'order-1' })).toBe('/orders/order-1');
  });

  it('maps a certificate to its detail page', () => {
    expect(notificationEntityRoute({ entityType: 'certificate', entityId: 'cert-1' })).toBe('/certificates/cert-1');
  });

  it('maps a conference to its public program view', () => {
    expect(notificationEntityRoute({ entityType: 'conference', entityId: 'conf-1' })).toBe(
      '/conferences/conf-1/program/view',
    );
  });

  it('returns null for an entityType the mapping does not cover', () => {
    expect(notificationEntityRoute({ entityType: 'something-new', entityId: 'x-1' })).toBeNull();
  });
});
