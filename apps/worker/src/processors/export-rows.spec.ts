import { mapAbstractRow, mapAuditLogRow, mapPaymentRow, mapRegistrationRow } from './export-rows';

describe('mapAbstractRow', () => {
  it('flattens the fields a CSV column needs, verbatim', () => {
    expect(
      mapAbstractRow({
        id: 'abs-1',
        submissionNumber: 'ABS-000001',
        title: 'A Study',
        submissionType: 'ORAL',
        status: 'ACCEPTED',
        trackId: 'track-1',
        submittedBy: 'user-1',
      }),
    ).toEqual({
      id: 'abs-1',
      submissionNumber: 'ABS-000001',
      title: 'A Study',
      submissionType: 'ORAL',
      status: 'ACCEPTED',
      trackId: 'track-1',
      submittedBy: 'user-1',
    });
  });
});

describe('mapRegistrationRow', () => {
  it('stringifies the Decimal amount and ISO-formats the date', () => {
    const row = mapRegistrationRow({
      id: 'reg-1',
      registrationNumber: 'REG-000001',
      userId: 'user-1',
      registrationTypeId: 'type-1',
      status: 'CONFIRMED',
      totalAmount: { toString: () => '150.00' },
      currency: 'USD',
      registeredAt: new Date('2027-01-01T00:00:00.000Z'),
    });

    expect(row.totalAmount).toBe('150.00');
    expect(row.registeredAt).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('mapPaymentRow', () => {
  it('renders a null paidAt as null, not an empty-string date', () => {
    const row = mapPaymentRow({
      id: 'pay-1',
      orderId: 'order-1',
      provider: 'razorpay',
      amount: { toString: () => '100.00' },
      currency: 'INR',
      status: 'SUCCESS',
      reference: null,
      paidAt: null,
    });

    expect(row.paidAt).toBeNull();
  });
});

describe('mapAuditLogRow', () => {
  it('flattens the audit log fields verbatim', () => {
    const row = mapAuditLogRow({
      id: 'log-1',
      action: 'organization.update',
      entityType: 'organization',
      entityId: 'org-1',
      actorUserId: 'user-1',
      createdAt: new Date('2027-01-01T00:00:00.000Z'),
    });

    expect(row).toEqual({
      id: 'log-1',
      action: 'organization.update',
      entityType: 'organization',
      entityId: 'org-1',
      actorUserId: 'user-1',
      createdAt: '2027-01-01T00:00:00.000Z',
    });
  });
});
