import type { AbstractRow, AuditLogRow, PaymentRow, RegistrationRow } from './export-row.types';

/** One flat-row mapper per export type — keeps the exact column set independently reviewable and testable per type. */
export function mapAbstractRow(row: AbstractRow): Record<string, unknown> {
  return {
    id: row.id,
    submissionNumber: row.submissionNumber,
    title: row.title,
    submissionType: row.submissionType,
    status: row.status,
    trackId: row.trackId,
    submittedBy: row.submittedBy,
  };
}

export function mapRegistrationRow(row: RegistrationRow): Record<string, unknown> {
  return {
    id: row.id,
    registrationNumber: row.registrationNumber,
    userId: row.userId,
    registrationTypeId: row.registrationTypeId,
    status: row.status,
    totalAmount: row.totalAmount.toString(),
    currency: row.currency,
    registeredAt: row.registeredAt.toISOString(),
  };
}

export function mapPaymentRow(row: PaymentRow): Record<string, unknown> {
  return {
    id: row.id,
    orderId: row.orderId,
    provider: row.provider,
    amount: row.amount.toString(),
    currency: row.currency,
    status: row.status,
    reference: row.reference,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  };
}

export function mapAuditLogRow(row: AuditLogRow): Record<string, unknown> {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorUserId: row.actorUserId,
    createdAt: row.createdAt.toISOString(),
  };
}
