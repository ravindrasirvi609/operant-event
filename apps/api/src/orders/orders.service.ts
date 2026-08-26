import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  manualPaymentInstructions?: true;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDERS)
    private readonly providers: Map<string, PaymentProvider>,
  ) {}

  /**
   * REG-002/PAY-003: the price is read once, from the already-snapshotted
   * Registration.totalAmount (itself resolved server-side at registration
   * time), and frozen again here into OrderItem/Order — nothing here ever
   * re-derives a price from a RegistrationType that might have changed
   * since.
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
      return { order, manualPaymentInstructions: true };
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

    return { order, checkoutUrl: checkout.checkoutUrl };
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
      (await this.prisma.order.count({ where: { conferenceId } })) + 1;

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
