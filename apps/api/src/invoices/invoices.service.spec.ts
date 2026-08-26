import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    order: { findUnique: jest.fn(), findFirst: jest.fn() },
    invoice: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
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

const paidOrder = {
  id: 'order-1',
  status: 'PAID',
  subtotal: 2000,
  discount: 0,
  tax: 0,
  total: 2000,
};

describe('InvoicesService.generateForOrder', () => {
  it('throws NotFoundException for an unknown order', async () => {
    const prisma = fakePrisma({
      order: { findUnique: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new InvoicesService(prisma).generateForOrder('order-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects generating an invoice for an order that has not been paid', async () => {
    const prisma = fakePrisma({
      order: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...paidOrder, status: 'PENDING' }),
      },
    });

    await expect(
      new InvoicesService(prisma).generateForOrder('order-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is idempotent — returns the existing invoice instead of creating a second one', async () => {
    const create = jest.fn();
    const prisma = fakePrisma({
      order: { findUnique: jest.fn().mockResolvedValue(paidOrder) },
      invoice: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'invoice-1', invoiceNumber: 'INV-000001' }),
        create,
        count: jest.fn(),
      },
    });

    const result = await new InvoicesService(prisma).generateForOrder(
      'order-1',
    );

    expect(result).toEqual({ id: 'invoice-1', invoiceNumber: 'INV-000001' });
    expect(create).not.toHaveBeenCalled();
  });

  it('creates the invoice snapshotting the order totals', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'invoice-1', invoiceNumber: 'INV-000001' });
    const prisma = fakePrisma({
      order: { findUnique: jest.fn().mockResolvedValue(paidOrder) },
      invoice: {
        findUnique: jest.fn().mockResolvedValue(null),
        create,
        count: jest.fn().mockResolvedValue(0),
      },
    });

    await new InvoicesService(prisma).generateForOrder('order-1');

    expect(create).toHaveBeenCalledWith({
      data: {
        invoiceNumber: 'INV-000001',
        orderId: 'order-1',
        subtotal: 2000,
        discount: 0,
        tax: 0,
        total: 2000,
      },
    });
  });

  it('retries with the next invoice number when the first candidate collides', async () => {
    const create = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({ id: 'invoice-1', invoiceNumber: 'INV-000002' });
    const prisma = fakePrisma({
      order: { findUnique: jest.fn().mockResolvedValue(paidOrder) },
      invoice: {
        findUnique: jest.fn().mockResolvedValue(null),
        create,
        count: jest.fn().mockResolvedValue(0),
      },
    });

    await new InvoicesService(prisma).generateForOrder('order-1');

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].data.invoiceNumber).toBe('INV-000001');
    expect(create.mock.calls[1][0].data.invoiceNumber).toBe('INV-000002');
  });
});

describe('InvoicesService.findOwned', () => {
  it('throws NotFoundException when the invoice does not belong to the caller', async () => {
    const prisma = fakePrisma({
      order: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new InvoicesService(prisma).findOwned('user-1', 'order-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('InvoicesService.findForOrganizer', () => {
  it('throws NotFoundException when the order is outside the caller organization', async () => {
    const prisma = fakePrisma({
      order: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new InvoicesService(prisma).findForOrganizer('org-1', 'order-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the invoice for an order within the caller organization', async () => {
    const invoice = { id: 'invoice-1', invoiceNumber: 'INV-000001' };
    const prisma = fakePrisma({
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: 'order-1', invoice }),
      },
    });

    const result = await new InvoicesService(prisma).findForOrganizer(
      'org-1',
      'order-1',
    );

    expect(result).toEqual(invoice);
  });
});
