export const REGISTRATION_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'CHECKED_IN'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const ORDER_STATUSES = ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface RegistrationType {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  currency: string;
  startDate: string;
  endDate: string;
  capacity: number | null;
}

export interface RegistrationCategory {
  id: string;
  conferenceId: string;
  name: string;
  description: string | null;
  types: RegistrationType[];
}

export interface Registration {
  id: string;
  conferenceId: string;
  registrationNumber: string;
  userId: string;
  registrationTypeId: string;
  status: RegistrationStatus;
  totalAmount: number;
  currency: string;
  qrCode: string | null;
  registeredAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  itemType: string;
  referenceId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  conferenceId: string;
  registrationId: string;
  orderNumber: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  status: OrderStatus;
  items?: OrderItem[];
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference: string | null;
  proofFileId: string | null;
  decidedBy: string | null;
  paidAt: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  documentFileId: string | null;
  issuedAt: string;
}

/**
 * The exact `OrdersService.create` response shape — `order` is always
 * present, and exactly one of `checkoutUrl` (GATEWAY) or
 * `manualPaymentInstructions: true` (MANUAL) accompanies it, never both,
 * never neither. Consumers must branch on which key is present here, not
 * on a separately-fetched `ConferenceSetting.paymentMode`.
 */
export type CreateOrderResult =
  | { order: Order; checkoutUrl: string }
  | { order: Order; manualPaymentInstructions: true };
