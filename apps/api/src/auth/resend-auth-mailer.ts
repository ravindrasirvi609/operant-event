import { createHash } from 'node:crypto';
import type { AuthMailer, AuthMailerRecipient } from './auth-mailer.interface';

export interface SendAuthEmailResult {
  data: { id: string } | null;
  error: { message: string } | null;
}

export type SendAuthEmailFn = (
  payload: { from: string; to: string[]; subject: string; html: string },
  options: { idempotencyKey: string },
) => Promise<SendAuthEmailResult>;

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Real email delivery for auth flows (SRS §5), swapped in for
 * ConsoleAuthMailer once RESEND_API_KEY is configured (see auth.module.ts).
 * Takes a send function rather than constructing a Resend client directly,
 * so it stays unit-testable without hitting the network — same pattern as
 * apps/worker's email.processor. The idempotency key hashes the raw token
 * rather than embedding it verbatim in metadata sent to a third party.
 */
export class ResendAuthMailer implements AuthMailer {
  constructor(
    private readonly send: SendAuthEmailFn,
    private readonly fromAddress: string,
    private readonly frontendUrl: string,
  ) {}

  sendEmailVerification(
    recipient: AuthMailerRecipient,
    rawToken: string,
  ): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${rawToken}`;
    return this.dispatch(
      recipient,
      'email-verification',
      rawToken,
      'Verify your email address',
      `<p>Hi ${recipient.firstName},</p><p>Please verify your email address:</p><p><a href="${url}">${url}</a></p>`,
    );
  }

  sendPasswordReset(
    recipient: AuthMailerRecipient,
    rawToken: string,
  ): Promise<void> {
    const url = `${this.frontendUrl}/password-reset/confirm?token=${rawToken}`;
    return this.dispatch(
      recipient,
      'password-reset',
      rawToken,
      'Reset your password',
      `<p>Hi ${recipient.firstName},</p><p>Reset your password:</p><p><a href="${url}">${url}</a></p>`,
    );
  }

  private async dispatch(
    recipient: AuthMailerRecipient,
    eventType: string,
    rawToken: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const { error } = await this.send(
      { from: this.fromAddress, to: [recipient.email], subject, html },
      { idempotencyKey: `${eventType}/${hashToken(rawToken)}` },
    );
    if (error) {
      throw new Error(error.message);
    }
  }
}
