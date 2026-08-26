import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentsService } from './payments.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { PaymentProvider } from './providers/payment-provider.interface';
import type { InvoicesService } from '../invoices/invoices.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    webhookEvent: { create: jest.fn().mockResolvedValue(undefined) },
    payment: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    order: { update: jest.fn(), findFirst: jest.fn() },
    registration: { update: jest.fn() },
    conference: {
      findFirst: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-1' }),
    },
  };
  const baseRecord = base as unknown as Record<
    string,
    Record<string, jest.Mock>
  >;
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(baseRecord[model], methods);
  }
  return base as unknown as PrismaService;
}

function fakeInvoices(
  overrides: Partial<Record<keyof InvoicesService, jest.Mock>> = {},
): InvoicesService {
  return {
    generateForOrder: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as InvoicesService;
}

function fakeEventEmitter(): EventEmitter2 {
  return { emit: jest.fn() } as unknown as EventEmitter2;
}

function fakeProvider(
  overrides: Partial<PaymentProvider> = {},
): PaymentProvider {
  return {
    name: 'razorpay',
    createCheckout: jest.fn(),
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
    parseWebhookEvent: jest.fn().mockReturnValue({
      eventId: 'pay_abc',
      providerOrderId: 'order_xyz',
      providerPaymentId: 'pay_abc',
      status: 'SUCCESS',
      amount: 2000,
      currency: 'INR',
    }),
    ...overrides,
  };
}

describe('PaymentsService.handleWebhook', () => {
  it('throws NotFoundException for an unknown provider', async () => {
    const service = new PaymentsService(
      fakePrisma(),
      new Map(),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await expect(
      service.handleWebhook('unknown', '{}', 'sig'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws UnauthorizedException and never touches the database when the signature is invalid', async () => {
    const webhookEventCreate = jest.fn();
    const provider = fakeProvider({
      verifyWebhookSignature: jest.fn().mockReturnValue(false),
    });
    const prisma = fakePrisma({ webhookEvent: { create: webhookEventCreate } });
    const service = new PaymentsService(
      prisma,
      new Map([['razorpay', provider]]),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await expect(
      service.handleWebhook('razorpay', '{}', 'bad-sig'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(webhookEventCreate).not.toHaveBeenCalled();
  });

  it('is idempotent: replaying the same event a second time is a silent no-op', async () => {
    const paymentUpdate = jest.fn();
    const webhookEventCreate = jest.fn().mockRejectedValue({ code: 'P2002' });
    const provider = fakeProvider();
    const prisma = fakePrisma({
      webhookEvent: { create: webhookEventCreate },
      payment: { findFirst: jest.fn(), update: paymentUpdate },
    });
    const service = new PaymentsService(
      prisma,
      new Map([['razorpay', provider]]),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await service.handleWebhook('razorpay', '{}', 'sig');

    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  it('on a SUCCESS event: marks the payment SUCCESS, the order PAID, and the registration CONFIRMED, then generates the invoice and emits payment.succeeded', async () => {
    const paymentUpdate = jest.fn().mockResolvedValue(undefined);
    const orderUpdate = jest.fn().mockResolvedValue({
      id: 'order-1',
      registrationId: 'reg-1',
      conferenceId: 'conf-1',
      orderNumber: 'ORD-000001',
    });
    const registrationUpdate = jest
      .fn()
      .mockResolvedValue({ userId: 'user-1' });
    const provider = fakeProvider();
    const invoices = fakeInvoices();
    const eventEmitter = fakeEventEmitter();
    const prisma = fakePrisma({
      payment: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'payment-1', orderId: 'order-1' }),
        update: paymentUpdate,
      },
      order: { update: orderUpdate, findFirst: jest.fn() },
      registration: { update: registrationUpdate },
    });
    const service = new PaymentsService(
      prisma,
      new Map([['razorpay', provider]]),
      invoices,
      eventEmitter,
    );

    await service.handleWebhook('razorpay', '{}', 'sig');

    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: 'SUCCESS',
        providerPaymentId: 'pay_abc',
        paidAt: expect.any(Date),
      },
    });
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'PAID' },
    });
    expect(registrationUpdate).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: {
        status: 'CONFIRMED',
        qrCode: expect.stringMatching(/^[0-9A-F]{16}$/),
      },
    });
    expect(invoices.generateForOrder).toHaveBeenCalledWith('order-1');
    expect(eventEmitter.emit).toHaveBeenCalledWith('payment.succeeded', {
      organizationId: 'org-1',
      conferenceId: 'conf-1',
      userId: 'user-1',
      templateData: { orderNumber: 'ORD-000001' },
    });
  });

  it('on a FAILED event: marks the payment FAILED and never confirms the order, registration, or invoice, and never emits payment.succeeded', async () => {
    const paymentUpdate = jest.fn().mockResolvedValue(undefined);
    const orderUpdate = jest.fn();
    const registrationUpdate = jest.fn();
    const invoices = fakeInvoices();
    const eventEmitter = fakeEventEmitter();
    const provider = fakeProvider({
      parseWebhookEvent: jest.fn().mockReturnValue({
        eventId: 'pay_abc',
        providerOrderId: 'order_xyz',
        providerPaymentId: 'pay_abc',
        status: 'FAILED',
        amount: 2000,
        currency: 'INR',
      }),
    });
    const prisma = fakePrisma({
      payment: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'payment-1', orderId: 'order-1' }),
        update: paymentUpdate,
      },
      order: { update: orderUpdate, findFirst: jest.fn() },
      registration: { update: registrationUpdate },
    });
    const service = new PaymentsService(
      prisma,
      new Map([['razorpay', provider]]),
      invoices,
      eventEmitter,
    );

    await service.handleWebhook('razorpay', '{}', 'sig');

    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: 'FAILED', providerPaymentId: 'pay_abc' },
    });
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(registrationUpdate).not.toHaveBeenCalled();
    expect(invoices.generateForOrder).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when no Payment row matches the provider order id', async () => {
    const provider = fakeProvider();
    const prisma = fakePrisma({
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    const service = new PaymentsService(
      prisma,
      new Map([['razorpay', provider]]),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await expect(
      service.handleWebhook('razorpay', '{}', 'sig'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PaymentsService.submitManualPaymentProof', () => {
  it('rejects an order that does not belong to the caller', async () => {
    const prisma = fakePrisma({
      order: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    const service = new PaymentsService(
      prisma,
      new Map(),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await expect(
      service.submitManualPaymentProof('user-1', 'order-x', {
        reference: 'UTR123',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a PENDING manual payment claim', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'payment-1' });
    const prisma = fakePrisma({
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          status: 'PENDING',
          total: 2000,
          currency: 'INR',
        }),
        update: jest.fn(),
      },
      payment: { create, findFirst: jest.fn(), update: jest.fn() },
    });
    const service = new PaymentsService(
      prisma,
      new Map(),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await service.submitManualPaymentProof('user-1', 'order-1', {
      reference: 'UTR123',
      proofFileId: 'file-1',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        orderId: 'order-1',
        provider: 'MANUAL',
        amount: 2000,
        currency: 'INR',
        status: 'PENDING',
        reference: 'UTR123',
        proofFileId: 'file-1',
      },
    });
  });
});

describe('PaymentsService.approveManualPayment', () => {
  it('rejects an order outside the caller organization', async () => {
    const prisma = fakePrisma({
      order: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    const service = new PaymentsService(
      prisma,
      new Map(),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await expect(
      service.approveManualPayment('org-1', 'order-x', 'staff-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects approving an order that is already paid', async () => {
    const prisma = fakePrisma({
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'order-1', status: 'PAID' }),
        update: jest.fn(),
      },
    });
    const service = new PaymentsService(
      prisma,
      new Map(),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await expect(
      service.approveManualPayment('org-1', 'order-1', 'staff-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('promotes an existing PENDING manual claim to SUCCESS, confirms the order/registration, generates the invoice, and emits payment.succeeded', async () => {
    const paymentUpdate = jest.fn().mockResolvedValue(undefined);
    const orderUpdate = jest.fn().mockResolvedValue({
      id: 'order-1',
      registrationId: 'reg-1',
      conferenceId: 'conf-1',
      orderNumber: 'ORD-000001',
    });
    const registrationUpdate = jest
      .fn()
      .mockResolvedValue({ userId: 'user-1' });
    const invoices = fakeInvoices();
    const eventEmitter = fakeEventEmitter();
    const prisma = fakePrisma({
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'order-1',
            status: 'PENDING',
            total: 2000,
            currency: 'INR',
          })
          .mockResolvedValueOnce({
            id: 'order-1',
            status: 'PENDING',
            total: 2000,
            currency: 'INR',
          }),
        update: orderUpdate,
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'payment-1' }),
        update: paymentUpdate,
        create: jest.fn(),
      },
      registration: { update: registrationUpdate },
    });
    const service = new PaymentsService(
      prisma,
      new Map(),
      invoices,
      eventEmitter,
    );

    await service.approveManualPayment('org-1', 'order-1', 'staff-1');

    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: 'SUCCESS',
        paidAt: expect.any(Date),
        decidedBy: 'staff-1',
      },
    });
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'PAID' },
    });
    expect(registrationUpdate).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: {
        status: 'CONFIRMED',
        qrCode: expect.stringMatching(/^[0-9A-F]{16}$/),
      },
    });
    expect(invoices.generateForOrder).toHaveBeenCalledWith('order-1');
    expect(eventEmitter.emit).toHaveBeenCalledWith('payment.succeeded', {
      organizationId: 'org-1',
      conferenceId: 'conf-1',
      userId: 'user-1',
      templateData: { orderNumber: 'ORD-000001' },
    });
  });

  it('creates a fresh SUCCESS payment when the registrant never submitted a claim first', async () => {
    const paymentCreate = jest.fn().mockResolvedValue({ id: 'payment-1' });
    const orderUpdate = jest
      .fn()
      .mockResolvedValue({ id: 'order-1', registrationId: 'reg-1' });
    const prisma = fakePrisma({
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          status: 'PENDING',
          total: 2000,
          currency: 'INR',
        }),
        update: orderUpdate,
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: paymentCreate,
        update: jest.fn(),
      },
      registration: {
        update: jest.fn().mockResolvedValue({ userId: 'user-1' }),
      },
    });
    const service = new PaymentsService(
      prisma,
      new Map(),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await service.approveManualPayment('org-1', 'order-1', 'staff-1');

    expect(paymentCreate).toHaveBeenCalledWith({
      data: {
        orderId: 'order-1',
        provider: 'MANUAL',
        amount: 2000,
        currency: 'INR',
        status: 'SUCCESS',
        paidAt: expect.any(Date),
        decidedBy: 'staff-1',
      },
    });
  });
});

describe('PaymentsService.rejectManualPayment', () => {
  it('throws NotFoundException when there is no pending manual claim to reject', async () => {
    const prisma = fakePrisma({
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'order-1', status: 'PENDING' }),
        update: jest.fn(),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    const service = new PaymentsService(
      prisma,
      new Map(),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await expect(
      service.rejectManualPayment('org-1', 'order-1', 'staff-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks the pending manual claim FAILED', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = fakePrisma({
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'order-1', status: 'PENDING' }),
        update: jest.fn(),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'payment-1' }),
        update,
      },
    });
    const service = new PaymentsService(
      prisma,
      new Map(),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await service.rejectManualPayment('org-1', 'order-1', 'staff-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: 'FAILED', decidedBy: 'staff-1' },
    });
  });
});

describe('PaymentsService.refund', () => {
  it('rejects refunding an order that was never paid', async () => {
    const prisma = fakePrisma({
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'order-1', status: 'PENDING' }),
        update: jest.fn(),
      },
    });
    const service = new PaymentsService(
      prisma,
      new Map(),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await expect(
      service.refund('org-1', 'order-1', 'staff-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks the payment, order, and registration REFUNDED', async () => {
    const paymentUpdate = jest.fn().mockResolvedValue(undefined);
    const orderUpdate = jest.fn().mockResolvedValue(undefined);
    const registrationUpdate = jest.fn().mockResolvedValue(undefined);
    const prisma = fakePrisma({
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          status: 'PAID',
          registrationId: 'reg-1',
        }),
        update: orderUpdate,
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'payment-1' }),
        update: paymentUpdate,
      },
      registration: { update: registrationUpdate },
    });
    const service = new PaymentsService(
      prisma,
      new Map(),
      fakeInvoices(),
      fakeEventEmitter(),
    );

    await service.refund('org-1', 'order-1', 'staff-1');

    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: 'REFUNDED', decidedBy: 'staff-1' },
    });
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'REFUNDED' },
    });
    expect(registrationUpdate).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: { status: 'REFUNDED' },
    });
  });
});
