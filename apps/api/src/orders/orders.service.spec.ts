import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { PaymentProvider } from '../payments/providers/payment-provider.interface';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    registration: { findFirst: jest.fn() },
    order: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    conferenceSetting: { findUnique: jest.fn() },
    payment: { create: jest.fn() },
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

function fakeProvider(
  overrides: Partial<PaymentProvider> = {},
): PaymentProvider {
  return {
    name: 'razorpay',
    createCheckout: jest.fn().mockResolvedValue({
      checkoutUrl: 'https://pay.example/checkout',
      providerOrderId: 'provider-order-1',
    }),
    verifyWebhookSignature: jest.fn(),
    parseWebhookEvent: jest.fn(),
    ...overrides,
  };
}

const pendingRegistration = {
  id: 'reg-1',
  userId: 'user-1',
  conferenceId: 'conf-1',
  registrationTypeId: 'type-1',
  status: 'PENDING',
  totalAmount: 2000,
  currency: 'INR',
};

describe('OrdersService.create', () => {
  it('rejects a registration that does not belong to the caller', async () => {
    const prisma = fakePrisma({
      registration: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new OrdersService(
      prisma,
      new Map([['razorpay', fakeProvider()]]),
    );

    await expect(service.create('user-1', 'reg-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects creating an order for a registration that is not PENDING', async () => {
    const prisma = fakePrisma({
      registration: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ ...pendingRegistration, status: 'CONFIRMED' }),
      },
    });
    const service = new OrdersService(prisma, new Map());

    await expect(service.create('user-1', 'reg-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects creating a second order for the same registration', async () => {
    const prisma = fakePrisma({
      registration: {
        findFirst: jest.fn().mockResolvedValue(pendingRegistration),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-order' }),
        create: jest.fn(),
        count: jest.fn(),
      },
    });
    const service = new OrdersService(prisma, new Map());

    await expect(service.create('user-1', 'reg-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('GATEWAY mode: creates the order, requests a checkout, and records an INITIATED payment', async () => {
    const orderCreate = jest.fn().mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-000001',
      currency: 'INR',
    });
    const paymentCreate = jest.fn().mockResolvedValue({ id: 'payment-1' });
    const provider = fakeProvider();
    const prisma = fakePrisma({
      registration: {
        findFirst: jest.fn().mockResolvedValue(pendingRegistration),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: orderCreate,
        count: jest.fn().mockResolvedValue(0),
      },
      conferenceSetting: {
        findUnique: jest.fn().mockResolvedValue({ paymentMode: 'GATEWAY' }),
      },
      payment: { create: paymentCreate },
    });
    const service = new OrdersService(
      prisma,
      new Map([['razorpay', provider]]),
    );

    const result = await service.create('user-1', 'reg-1', 'razorpay');

    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conferenceId: 'conf-1',
          registrationId: 'reg-1',
          subtotal: 2000,
          discount: 0,
          tax: 0,
          total: 2000,
          currency: 'INR',
          status: 'PENDING',
        }),
      }),
    );
    expect(provider.createCheckout).toHaveBeenCalledWith({
      orderId: 'order-1',
      orderNumber: 'ORD-000001',
      amount: 2000,
      currency: 'INR',
    });
    expect(paymentCreate).toHaveBeenCalledWith({
      data: {
        orderId: 'order-1',
        provider: 'razorpay',
        providerOrderId: 'provider-order-1',
        amount: 2000,
        currency: 'INR',
        status: 'INITIATED',
      },
    });
    expect(result).toEqual({
      order: { id: 'order-1', orderNumber: 'ORD-000001', currency: 'INR' },
      checkoutUrl: 'https://pay.example/checkout',
    });
  });

  it('MANUAL mode: creates the order without calling any payment provider', async () => {
    const orderCreate = jest.fn().mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-000001',
      currency: 'INR',
    });
    const provider = fakeProvider();
    const prisma = fakePrisma({
      registration: {
        findFirst: jest.fn().mockResolvedValue(pendingRegistration),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: orderCreate,
        count: jest.fn().mockResolvedValue(0),
      },
      conferenceSetting: {
        findUnique: jest.fn().mockResolvedValue({ paymentMode: 'MANUAL' }),
      },
    });
    const service = new OrdersService(
      prisma,
      new Map([['razorpay', provider]]),
    );

    const result = await service.create('user-1', 'reg-1');

    expect(provider.createCheckout).not.toHaveBeenCalled();
    expect(result).toEqual({
      order: { id: 'order-1', orderNumber: 'ORD-000001', currency: 'INR' },
      manualPaymentInstructions: true,
    });
  });

  it('defaults to MANUAL mode when the conference has no settings configured at all', async () => {
    const orderCreate = jest.fn().mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-000001',
      currency: 'INR',
    });
    const provider = fakeProvider();
    const prisma = fakePrisma({
      registration: {
        findFirst: jest.fn().mockResolvedValue(pendingRegistration),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: orderCreate,
        count: jest.fn().mockResolvedValue(0),
      },
      conferenceSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    const service = new OrdersService(
      prisma,
      new Map([['razorpay', provider]]),
    );

    const result = await service.create('user-1', 'reg-1');

    expect(provider.createCheckout).not.toHaveBeenCalled();
    expect(result).toEqual({
      order: { id: 'order-1', orderNumber: 'ORD-000001', currency: 'INR' },
      manualPaymentInstructions: true,
    });
  });
});

describe('OrdersService.findOwned', () => {
  it('throws NotFoundException when the order does not belong to the caller', async () => {
    const prisma = fakePrisma({
      order: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new OrdersService(prisma, new Map()).findOwned('user-1', 'order-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('finds the order via the registration relation, since Order has no userId column', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'order-1', status: 'PENDING' });
    const prisma = fakePrisma({ order: { findFirst } });

    const result = await new OrdersService(prisma, new Map()).findOwned(
      'user-1',
      'order-1',
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'order-1', registration: { userId: 'user-1' } },
    });
    expect(result).toEqual({ id: 'order-1', status: 'PENDING' });
  });
});

describe('OrdersService.findForOrganizer', () => {
  it('throws NotFoundException when the order is outside the caller organization', async () => {
    const prisma = fakePrisma({
      order: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new OrdersService(prisma, new Map()).findForOrganizer('org-1', 'order-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('finds the order scoped to the caller organization', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'order-1', status: 'PAID' });
    const prisma = fakePrisma({ order: { findFirst } });

    const result = await new OrdersService(prisma, new Map()).findForOrganizer(
      'org-1',
      'order-1',
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'order-1', conference: { organizationId: 'org-1' } },
    });
    expect(result).toEqual({ id: 'order-1', status: 'PAID' });
  });
});

describe('OrdersService.findAllForOrganizer', () => {
  it('lists orders scoped to the conference, optionally filtered by status', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'order-1' }]);
    const prisma = fakePrisma({ order: { findMany } });

    const result = await new OrdersService(
      prisma,
      new Map(),
    ).findAllForOrganizer('org-1', 'conf-1', 'PENDING');

    expect(findMany).toHaveBeenCalledWith({
      where: {
        conferenceId: 'conf-1',
        conference: { organizationId: 'org-1' },
        status: 'PENDING',
      },
      include: { payments: true },
    });
    expect(result).toEqual([{ id: 'order-1' }]);
  });

  it('omits the status filter when none is given', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = fakePrisma({ order: { findMany } });

    await new OrdersService(prisma, new Map()).findAllForOrganizer(
      'org-1',
      'conf-1',
    );

    expect(findMany).toHaveBeenCalledWith({
      where: {
        conferenceId: 'conf-1',
        conference: { organizationId: 'org-1' },
      },
      include: { payments: true },
    });
  });
});
