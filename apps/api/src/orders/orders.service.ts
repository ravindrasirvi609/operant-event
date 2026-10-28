
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrderStatus } from '@operant-event/database';
import { PrismaService } from '../common/prisma/prisma.service';
import { formatSequenceNumber } from '../common/utils/sequence-number.util';
import { isUniqueConstraintViolation } from '../common/utils/prisma-errors.util';
import {
  PAYMENT_PROVIDERS,
  type PaymentProvider,
} from '../payments/providers/payment-provider.interface';

const MAX_NUMBER_ATTEMPTS = 5;

export interface CreateOrderResult {
  order: { id: string; orderNumber: string; currency: string };
  checkoutUrl?: string;
  manualPaymentInstructions?: string;
}

export interface RegistrationOrderResult {
  order: Awaited<ReturnType<PrismaService['order']['findUnique']>>;
  paymentMode: 'GATEWAY' | 'MANUAL';
  manualPaymentInstructions?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDERS)
    private readonly providers: Map<string, PaymentProvider>,
  ) {}

  /**
   * Price is taken from the server-calculated Registration.totalAmount
   * and frozen into Order and OrderItem.
   */
  async create(
    userId: string,
    registrationId: string,
    providerName?: string,
  ): Promise<CreateOrderResult> {
    const registration = await this.prisma.registration.findFirst({
      where: { id: registrationId, userId },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found.');
    }

    if (registration.status !== 'PENDING') {
      throw new BadRequestException(
        `This registration is ${registration.status} and cannot be ordered.`,
      );
    }

    const existingOrder = await this.prisma.order.findUnique({
      where: { registrationId },
    });

    if (existingOrder) {
      throw new ConflictException(
        'An order already exists for this registration.',
      );
    }

    const settings = await this.prisma.conferenceSetting.findUnique({
      where: { conferenceId: registration.conferenceId },
    });

    const paymentMode = settings?.paymentMode ?? 'MANUAL';

    const subtotal = Number(registration.totalAmount);
    const discount = 0;
    const tax = 0;
    const total = subtotal + tax - discount;

    const order = await this.createOrderWithRetry(
      registration.conferenceId,
      registrationId,
      {
        subtotal,
        discount,
        tax,
        total,
        currency: registration.currency,
        registrationTypeId: registration.registrationTypeId,
      },
    );

    if (paymentMode !== 'GATEWAY') {
      return {
        order,
        manualPaymentInstructions:
          settings?.manualPaymentInstructions?.trim() || undefined,
      };
    }

    const provider = this.providers.get(providerName ?? 'razorpay');

    if (!provider) {
      throw new BadRequestException(
        `Unknown or unconfigured payment provider "${providerName ?? 'razorpay'}".`,
      );
    }

    const checkout = await provider.createCheckout({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: total,
      currency: order.currency,
    });

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: provider.name,
        providerOrderId: checkout.providerOrderId,
        amount: total,
        currency: order.currency,
        status: 'INITIATED',
      },
    });

    return {
      order,
      checkoutUrl: checkout.checkoutUrl,
    };
  }

  /**
   * Returns the existing order for a registration.
   * This prevents the frontend from trying to create a duplicate order.
   */
  async findForRegistration(
    userId: string,
    registrationId: string,
  ): Promise<RegistrationOrderResult | null> {
    const registration = await this.prisma.registration.findFirst({
      where: {
        id: registrationId,
        userId,
      },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found.');
    }

    const order = await this.prisma.order.findUnique({
      where: {
        registrationId,
      },
      include: {
        payments: {
          orderBy: {
            paidAt: 'desc',
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    const hasGatewayPayment = order.payments.some(
      (payment) => Boolean(payment.providerOrderId),
    );

    let manualPaymentInstructions: string | undefined;

    if (!hasGatewayPayment) {
      const settings = await this.prisma.conferenceSetting.findUnique({
        where: {
          conferenceId: registration.conferenceId,
        },
        select: {
          manualPaymentInstructions: true,
        },
      });

      manualPaymentInstructions =
        settings?.manualPaymentInstructions?.trim() || undefined;
    }

    return {
      order,
      paymentMode: hasGatewayPayment ? 'GATEWAY' : 'MANUAL',
      manualPaymentInstructions,
    };
  }

  /**
   * Owner-facing read: ownership is checked through the registration relation.
   */
  async findOwned(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        registration: {
          userId,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  async findForOrganizer(organizationId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        conference: {
          organizationId,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  /**
   * Lists orders for a conference, optionally filtered by status.
   */
  async findAllForOrganizer(
    organizationId: string,
    conferenceId: string,
    status?: OrderStatus,
  ) {
    return this.prisma.order.findMany({
      where: {
        conferenceId,
        conference: {
          organizationId,
        },
        ...(status !== undefined && { status }),
      },
      include: {
        payments: true,
      },
    });
  }

  private async createOrderWithRetry(
    conferenceId: string,
    registrationId: string,
    priced: {
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
      currency: string;
      registrationTypeId: string;
    },
  ) {
    let sequence =
      (await this.prisma.order.count({
        where: { conferenceId },
      })) + 1;

    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
      const orderNumber = formatSequenceNumber('ORD', sequence);

      try {
        return await this.prisma.order.create({
          data: {
            conferenceId,
            registrationId,
            orderNumber,
            subtotal: priced.subtotal,
            discount: priced.discount,
            tax: priced.tax,
            total: priced.total,
            currency: priced.currency,
            status: 'PENDING',
            items: {
              create: [
                {
                  itemType: 'REGISTRATION',
                  referenceId: priced.registrationTypeId,
                  description: 'Conference registration',
                  quantity: 1,
                  unitPrice: priced.subtotal,
                  totalPrice: priced.subtotal,
                },
              ],
            },
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
      'Could not assign a unique order number; please retry.',
    );
  }
}
