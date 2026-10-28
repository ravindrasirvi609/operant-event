import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';

import { PaymentsService } from './payments.service';
import { SubmitManualPaymentProofDto } from './dto/submit-manual-payment-proof.dto';
import { RejectManualPaymentDto } from './dto/reject-manual-payment.dto';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

import { FilesService } from '../files/files.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly filesService: FilesService,
  ) {}

  // Payment provider webhook.
  @Post('webhooks/payments/:provider')
  handleWebhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') razorpaySignature: string,
    @Headers('stripe-signature') stripeSignature: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    const signatureHeader =
      provider === 'stripe' ? stripeSignature : razorpaySignature;

    return this.paymentsService.handleWebhook(
      provider,
      rawBody,
      signatureHeader,
    );
  }

  // Registrant submits manual payment proof.
  @UseGuards(JwtAuthGuard)
  @Post('orders/:orderId/payment-proof')
  submitManualPaymentProof(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: SubmitManualPaymentProofDto,
  ) {
    return this.paymentsService.submitManualPaymentProof(
      user.id,
      orderId,
      dto,
    );
  }

  // Organizer downloads a payment proof belonging to their organization.
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PAYMENT_MANAGE)
  @Get('orders/:orderId/payments/:paymentId/proof')
  async downloadManualPaymentProof(
    @CurrentOrganizationId() organizationId: string,
    @Param('orderId') orderId: string,
    @Param('paymentId') paymentId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const proof = await this.paymentsService.getManualPaymentProof(
      organizationId,
      orderId,
      paymentId,
    );

    const { file, buffer } =
      await this.filesService.downloadPaymentProof(
        proof.fileId,
        proof.uploadedBy,
      );

    const safeFileName = file.fileName.replace(/["\r\n]/g, '_');

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}"`,
    );

    return new StreamableFile(buffer, {
      type: file.mimeType,
    });
  }

  // Organizer approves a manual payment.
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PAYMENT_MANAGE)
  @Post('orders/:orderId/approve-payment')
  approveManualPayment(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.approveManualPayment(
      organizationId,
      orderId,
      user.id,
    );
  }

  // Organizer rejects a manual payment.
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PAYMENT_MANAGE)
  @Post('orders/:orderId/reject-payment')
  rejectManualPayment(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: RejectManualPaymentDto,
  ) {
    return this.paymentsService.rejectManualPayment(
      organizationId,
      orderId,
      user.id,
      dto.reason,
    );
  }

  // Organizer refunds a paid order.
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PAYMENT_REFUND)
  @Post('orders/:orderId/refund')
  refund(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.refund(
      organizationId,
      orderId,
      user.id,
    );
  }
}
