import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Order } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { formatSequenceNumber } from '../common/utils/sequence-number.util';
import { isUniqueConstraintViolation } from '../common/utils/prisma-errors.util';

const MAX_NUMBER_ATTEMPTS = 5;

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * PAY-005. Idempotent: calling this again for the same order returns the
   * already-issued invoice rather than creating a second one. Actual PDF
   * rendering (Invoice.documentFileId) is deferred — needs a PDF library
   * plus the same apps/worker job wiring already deferred elsewhere in
   * this codebase; the invoice record itself (numbers, totals) is real.
   */
  async generateForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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

    return this.createInvoiceWithRetry(order);
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
