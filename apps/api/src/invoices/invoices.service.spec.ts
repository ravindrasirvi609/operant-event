import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { FilesService } from '../files/files.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    order: { findUnique: jest.fn(), findFirst: jest.fn() },
    invoice: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
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

function fakeFilesService(
  overrides: Partial<Record<keyof FilesService, jest.Mock>> = {},
) {
  return {
    upload: jest.fn().mockResolvedValue({ id: 'file-1' }),
    ...overrides,
  } as unknown as FilesService;
}

const paidOrder = {
  id: 'order-1',
  orderNumber: 'ORD-000001',
  status: 'PAID',
  subtotal: 2000,
  discount: 0,
  tax: 0,
  total: 2000,
  currency: 'USD',
  conference: { name: 'Operant Summit 2027', organizationId: 'org-1' },
  registration: {
    userId: 'user-1',
    user: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
  },
  items: [
    {
      description: 'Standard Registration',
      quantity: 1,
      unitPrice: 2000,
      totalPrice: 2000,
    },
  ],
};

describe('InvoicesService.generateForOrder', () => {
  it('throws NotFoundException for an unknown order', async () => {
    const prisma = fakePrisma({
      order: { findUnique: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new InvoicesService(prisma, fakeFilesService()).generateForOrder(
        'order-x',
      ),
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
      new InvoicesService(prisma, fakeFilesService()).generateForOrder(
        'order-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is idempotent — returns the existing invoice instead of creating a second one', async () => {
    const create = jest.fn();
    const upload = jest.fn();
    const prisma = fakePrisma({
      order: { findUnique: jest.fn().mockResolvedValue(paidOrder) },
      invoice: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'invoice-1', invoiceNumber: 'INV-000001' }),
        create,
        update: jest.fn(),
        count: jest.fn(),
      },
    });

    const result = await new InvoicesService(
      prisma,
      fakeFilesService({ upload }),
    ).generateForOrder('order-1');

    expect(result).toEqual({ id: 'invoice-1', invoiceNumber: 'INV-000001' });
    expect(create).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('creates the invoice snapshotting the order totals, renders a PDF, and sets documentFileId', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'invoice-1',
      invoiceNumber: 'INV-000001',
      subtotal: 2000,
      discount: 0,
      tax: 0,
      total: 2000,
      issuedAt: new Date('2027-06-01T00:00:00Z'),
    });
    const update = jest.fn().mockResolvedValue({
      id: 'invoice-1',
      invoiceNumber: 'INV-000001',
      documentFileId: 'file-1',
    });
    const upload = jest.fn().mockResolvedValue({ id: 'file-1' });
    const prisma = fakePrisma({
      order: { findUnique: jest.fn().mockResolvedValue(paidOrder) },
      invoice: {
        findUnique: jest.fn().mockResolvedValue(null),
        create,
        update,
        count: jest.fn().mockResolvedValue(0),
      },
    });

    const result = await new InvoicesService(
      prisma,
      fakeFilesService({ upload }),
    ).generateForOrder('order-1');

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
    expect(upload).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      expect.objectContaining({
        fileName: 'INV-000001.pdf',
        mimeType: 'application/pdf',
        buffer: expect.any(Buffer),
      }),
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: { documentFileId: 'file-1' },
    });
    expect(result).toEqual({
      id: 'invoice-1',
      invoiceNumber: 'INV-000001',
      documentFileId: 'file-1',
    });
  });

  it('retries with the next invoice number when the first candidate collides', async () => {
    const create = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({
        id: 'invoice-1',
        invoiceNumber: 'INV-000002',
        subtotal: 2000,
        discount: 0,
        tax: 0,
        total: 2000,
        issuedAt: new Date('2027-06-01T00:00:00Z'),
      });
    const prisma = fakePrisma({
      order: { findUnique: jest.fn().mockResolvedValue(paidOrder) },
      invoice: {
        findUnique: jest.fn().mockResolvedValue(null),
        create,
        update: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
        count: jest.fn().mockResolvedValue(0),
      },
    });

    await new InvoicesService(prisma, fakeFilesService()).generateForOrder(
      'order-1',
    );

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
      new InvoicesService(prisma, fakeFilesService()).findOwned(
        'user-1',
        'order-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('InvoicesService.findForOrganizer', () => {
  it('throws NotFoundException when the order is outside the caller organization', async () => {
    const prisma = fakePrisma({
      order: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new InvoicesService(prisma, fakeFilesService()).findForOrganizer(
        'org-1',
        'order-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the invoice for an order within the caller organization', async () => {
    const invoice = { id: 'invoice-1', invoiceNumber: 'INV-000001' };
    const prisma = fakePrisma({
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: 'order-1', invoice }),
      },
    });

    const result = await new InvoicesService(
      prisma,
      fakeFilesService(),
    ).findForOrganizer('org-1', 'order-1');

    expect(result).toEqual(invoice);
  });
});
