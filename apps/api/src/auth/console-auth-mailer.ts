import { Injectable, Logger } from '@nestjs/common';
import type { AuthMailer, AuthMailerRecipient } from './auth-mailer.interface';

/** Dev-only stopgap: logs instead of sending. Replace with a real provider in Phase 6. */
@Injectable()
export class ConsoleAuthMailer implements AuthMailer {
  private readonly logger = new Logger(ConsoleAuthMailer.name);

  sendEmailVerification(
    recipient: AuthMailerRecipient,
    rawToken: string,
  ): Promise<void> {
    this.logger.warn(
      `[dev-only] Email verification for ${recipient.email}: token=${rawToken}`,
    );
    return Promise.resolve();
  }

  sendPasswordReset(
    recipient: AuthMailerRecipient,
    rawToken: string,
  ): Promise<void> {
    this.logger.warn(
      `[dev-only] Password reset for ${recipient.email}: token=${rawToken}`,
    );
    return Promise.resolve();
  }
}
