/** Minimal field subsets mirroring @operant-event/database's generated model shapes — only what each export column set needs. */
export interface AbstractRow {
  id: string;
  submissionNumber: string | null;
  title: string;
  submissionType: string;
  status: string;
  trackId: string | null;
  submittedBy: string;
}

export interface RegistrationRow {
  id: string;
  registrationNumber: string;
  userId: string;
  registrationTypeId: string;
  status: string;
  totalAmount: { toString(): string };
  currency: string;
  registeredAt: Date;
}

export interface PaymentRow {
  id: string;
  orderId: string;
  provider: string;
  amount: { toString(): string };
  currency: string;
  status: string;
  reference: string | null;
  paidAt: Date | null;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  createdAt: Date;
}
