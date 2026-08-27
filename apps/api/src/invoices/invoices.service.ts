import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Invoice, Order, Prisma } from '@operant-event/database';
import { PrismaService } from '../common/prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { formatSequenceNumber } from '../common/utils/sequence-number.util';
import { isUniqueConstraintViolation } from '../common/utils/prisma-errors.util';
import { renderInvoicePdf } from '../common/pdf/pdf-renderer.util';

const MAX_NUMBER_ATTEMPTS = 5;

type OrderForInvoice = Prisma.OrderGetPayload<{
  include: {
    conference: true;
    registration: { include: { user: true } };
    items: true;
  };
}>;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * PAY-005. Idempotent: calling this again for the same order returns the
   * already-issued invoice rather than creating a second one. On first
   * creation, also renders and uploads the invoice PDF and sets
   * `Invoice.documentFileId`.
   */
  async generateForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        conference: true,
        registration: { include: { user: true } },
        items: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    if (order.status !== 'PAID') {
      throw new BadRequestException('Only a paid order can be invoiced.');
    }

    const existing = await this.prisma.invoice.findUnique({
      where: { orderId },
    });
    if (existing) {
      return existing;
    }

    const invoice = await this.createInvoiceWithRetry(order);
    return this.attachDocument(order, invoice);
  }

  private async attachDocument(order: OrderForInvoice, invoice: Invoice) {
    const buffer = await renderInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: order.orderNumber,
      issuedAt: invoice.issuedAt,
      conferenceName: order.conference.name,
      billedToName: `${order.registration.user.firstName} ${order.registration.user.lastName}`,
      billedToEmail: order.registration.user.email,
      items: order.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
      subtotal: invoice.subtotal.toString(),
      discount: invoice.discount.toString(),
      tax: invoice.tax.toString(),
      total: invoice.total.toString(),
      currency: order.currency,
    });

    const file = await this.filesService.upload(
      order.conference.organizationId,
      order.registration.userId,
      {
        fileName: `${invoice.invoiceNumber}.pdf`,
        mimeType: 'application/pdf',
        size: buffer.length,
        buffer,
      },
    );

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { documentFileId: file.id },
    });
  }

  async findOwned(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, registration: { userId } },
      include: { invoice: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    return order.invoice;
  }

  async findForOrganizer(organizationId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, conference: { organizationId } },
      include: { invoice: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    return order.invoice;
  }

  private async createInvoiceWithRetry(
    order: Pick<Order, 'id' | 'subtotal' | 'discount' | 'tax' | 'total'>,
  ) {
    let sequence = (await this.prisma.invoice.count()) + 1;

    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
      const invoiceNumber = formatSequenceNumber('INV', sequence);
      try {
        return await this.prisma.invoice.create({
          data: {
            invoiceNumber,
            orderId: order.id,
            subtotal: order.subtotal,
            discount: order.discount,
            tax: order.tax,
            total: order.total,
          },
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          sequence += 1;
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      'Could not assign a unique invoice number; please retry.',
    );
  }
}
