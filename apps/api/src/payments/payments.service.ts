import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { isUniqueConstraintViolation } from '../common/utils/prisma-errors.util';
import { generateQrCode } from '../common/utils/qr-code.util';
import {
  PAYMENT_PROVIDERS,
  type PaymentProvider,
} from './providers/payment-provider.interface';
import type { SubmitManualPaymentProofDto } from './dto/submit-manual-payment-proof.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { NOTIFICATION_EVENTS } from '../notifications/notification.events';

const MAX_QR_CODE_ATTEMPTS = 5;

@Injectable()
export class PaymentsService {
  constructor(
  private readonly prisma: PrismaService,
  @Inject(PAYMENT_PROVIDERS)
  private readonly providers: Map<string, PaymentProvider>,
  private readonly invoicesService: InvoicesService,
  private readonly eventEmitter: EventEmitter2,
  private readonly filesService: FilesService,
) {}

  /**
   * PAY-002: signature-verified, idempotent. A client-side success
   * callback never reaches this path at all — this is the only code that
   * can mark an order PAID (see also approveManualPayment for the
   * MANUAL-mode equivalent, which is likewise never reachable from an
   * unauthenticated/unpermissioned caller).
   */
  async handleWebhook(
    providerName: string,
    rawBody: string,
    signatureHeader: string,
  ): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new NotFoundException(
        `Unknown payment provider "${providerName}".`,
      );
    }

    if (!provider.verifyWebhookSignature(rawBody, signatureHeader)) {
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    const event = provider.parseWebhookEvent(rawBody);
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');

    try {
      await this.prisma.webhookEvent.create({
        data: { provider: providerName, eventId: event.eventId, payloadHash },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return; // Already processed this exact event — replay is a silent no-op.
      }
      throw error;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { provider: providerName, providerOrderId: event.providerOrderId },
    });
    if (!payment) {
      throw new NotFoundException(
        `No payment record found for provider order ${event.providerOrderId}.`,
      );
    }

    if (event.status === 'FAILED') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', providerPaymentId: event.providerPaymentId },
      });
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        providerPaymentId: event.providerPaymentId,
        paidAt: new Date(),
      },
    });

    await this.confirmOrderPaid(payment.orderId);
  }

  /** Registrant-facing: claims a payment was made offline. Does not confirm anything by itself. */
 

  /**
   * Registrant-facing: submits or updates a manual payment claim.
   * Uploading proof does not automatically confirm payment.
   */
  
  async submitManualPaymentProof(
    userId: string,
    orderId: string,
    dto: SubmitManualPaymentProofDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        registration: { userId },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `This order is ${order.status}; no payment proof can be submitted.`,
      );
    }
    if (dto.proofFileId) {
  await this.filesService.assertSelfOwnedFile(
    dto.proofFileId,
    userId,
  );
}

    // Reuse the existing pending manual payment, if present.
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        provider: 'MANUAL',
        status: 'PENDING',
      },
    });

    if (existingPayment) {
      return this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          reference: dto.reference ?? existingPayment.reference,
          proofFileId: dto.proofFileId,
        },
      });
    }

    // The partial unique index protects against concurrent submissions.
    try {
      return await this.prisma.payment.create({
        data: {
          orderId,
          provider: 'MANUAL',
          amount: order.total,
          currency: order.currency,
          status: 'PENDING',
          reference: dto.reference,
          proofFileId: dto.proofFileId,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) {
        throw error;
      }

      // Another request may have created the pending payment first.
      const racedPayment = await this.prisma.payment.findFirst({
        where: {
          orderId,
          provider: 'MANUAL',
          status: 'PENDING',
        },
      });

      if (!racedPayment) {
        throw error;
      }

      return this.prisma.payment.update({
        where: { id: racedPayment.id },
        data: {
          reference: dto.reference ?? racedPayment.reference,
          proofFileId: dto.proofFileId,
        },
      });
    }
  }


async getManualPaymentProof(
  organizationId: string,
  orderId: string,
  paymentId: string,
) {
  const payment = await this.prisma.payment.findFirst({
    where: {
      id: paymentId,
      orderId,
      provider: 'MANUAL',
      proofFileId: { not: null },
      order: {
        conference: {
          organizationId,
        },
      },
    },
    select: {
      id: true,
      orderId: true,
      reference: true,
      proofFileId: true,
      order: {
        select: {
          registration: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!payment?.proofFileId) {
    throw new NotFoundException('Payment proof not found.');
  }

  return {
    id: payment.id,
    orderId: payment.orderId,
    reference: payment.reference,
    fileId: payment.proofFileId,
    uploadedBy: payment.order.registration.userId,
  };
}

  /**
   * Staff-only trusted confirmation for conferences with no payment
   * gateway configured (ConferenceSetting.paymentMode === MANUAL) — the
   * audited equivalent of a verified webhook. Works whether or not the
   * registrant submitted a proof claim first.
   */
  async approveManualPayment(
    organizationId: string,
    orderId: string,
    decidedBy: string,
  ): Promise<void> {
    const order = await this.assertOrderInOrganization(organizationId, orderId);
    if (order.status === 'PAID') {
      throw new ConflictException('This order has already been paid.');
    }

    const pendingClaim = await this.prisma.payment.findFirst({
      where: { orderId, provider: 'MANUAL', status: 'PENDING' },
    });

    if (pendingClaim) {
      await this.prisma.payment.update({
        where: { id: pendingClaim.id },
        data: { status: 'SUCCESS', paidAt: new Date(), decidedBy },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          orderId,
          provider: 'MANUAL',
          amount: order.total,
          currency: order.currency,
          status: 'SUCCESS',
          paidAt: new Date(),
          decidedBy,
        },
      });
    }

    await this.confirmOrderPaid(orderId);
  }

  async rejectManualPayment(
    organizationId: string,
    orderId: string,
    decidedBy: string,
    reason?: string,
  ) {
    await this.assertOrderInOrganization(organizationId, orderId);

    const pendingClaim = await this.prisma.payment.findFirst({
      where: { orderId, provider: 'MANUAL', status: 'PENDING' },
    });
    if (!pendingClaim) {
      throw new NotFoundException(
        'No pending manual payment claim found for this order.',
      );
    }

    return this.prisma.payment.update({
      where: { id: pendingClaim.id },
      data: { status: 'FAILED', decidedBy, rejectionReason: reason },
    });
  }

  /** REG-006/PAY-006. */
  async refund(
    organizationId: string,
    orderId: string,
    decidedBy: string,
  ): Promise<void> {
    const order = await this.assertOrderInOrganization(organizationId, orderId);
    if (order.status !== 'PAID') {
      throw new BadRequestException('Only a paid order can be refunded.');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, status: 'SUCCESS' },
    });
    if (!payment) {
      throw new NotFoundException('No successful payment found to refund.');
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', decidedBy },
    });
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'REFUNDED' },
    });
    await this.prisma.registration.update({
      where: { id: order.registrationId },
      data: { status: 'REFUNDED' },
    });
  }

  /**
   * Shared by the webhook path and the manual-approval path. Invoice
   * generation is idempotent (InvoicesService.generateForOrder), so this
   * is safe to call even if a retry ever runs confirmOrderPaid twice for
   * the same order. Email/notification dispatch is a Phase 6 concern.
   */
  private async confirmOrderPaid(orderId: string): Promise<void> {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });
    const registration = await this.confirmRegistration(order.registrationId);
    await this.invoicesService.generateForOrder(orderId);
    await this.emitPaymentSucceeded(order, registration.userId);
  }

  /**
   * Phase 5 (SRS §17): a Registration gets its check-in qrCode the moment
   * it's confirmed. qrCode is globally unique, so a collision (astronomically
   * unlikely at 8 random bytes) retries with a fresh code rather than
   * failing the whole payment-confirmation flow.
   */
  private async confirmRegistration(
    registrationId: string,
    attempt = 0,
  ): Promise<{ userId: string }> {
    try {
      return await this.prisma.registration.update({
        where: { id: registrationId },
        data: { status: 'CONFIRMED', qrCode: generateQrCode() },
      });
    } catch (error) {
      if (
        isUniqueConstraintViolation(error) &&
        attempt < MAX_QR_CODE_ATTEMPTS
      ) {
        return this.confirmRegistration(registrationId, attempt + 1);
      }
      throw error;
    }
  }

  /** §20 trigger: "Payment successful". No-ops silently if the conference has since been deleted. */
  private async emitPaymentSucceeded(
    order: { id: string; conferenceId: string; orderNumber: string },
    userId: string,
  ): Promise<void> {
    const conference = await this.prisma.conference.findUnique({
      where: { id: order.conferenceId },
      select: { organizationId: true },
    });
    if (!conference) {
      return;
    }
    this.eventEmitter.emit(NOTIFICATION_EVENTS.PAYMENT_SUCCEEDED, {
      organizationId: conference.organizationId,
      conferenceId: order.conferenceId,
      userId,
      templateData: { orderNumber: order.orderNumber },
      entityType: 'order',
      entityId: order.id,
    });
  }

  private async assertOrderInOrganization(
    organizationId: string,
    orderId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, conference: { organizationId } },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    return order;
  }
}
