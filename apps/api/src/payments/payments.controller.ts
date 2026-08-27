import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
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

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // No guard: the payment provider's HMAC signature IS the authentication.
  // Requires app.rawBody: true in main.ts so req.rawBody carries the exact
  // bytes the provider signed (JSON.stringify() would not reproduce them).
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

  // Registrant-facing: claims an offline payment was made (MANUAL mode).
  @UseGuards(JwtAuthGuard)
  @Post('orders/:orderId/payment-proof')
  submitManualPaymentProof(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: SubmitManualPaymentProofDto,
  ) {
    return this.paymentsService.submitManualPaymentProof(user.id, orderId, dto);
  }

  // Staff-facing: trusted confirmation/rejection for MANUAL-mode orders.
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PAYMENT_REFUND)
  @Post('orders/:orderId/refund')
  refund(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.refund(organizationId, orderId, user.id);
  }
}
