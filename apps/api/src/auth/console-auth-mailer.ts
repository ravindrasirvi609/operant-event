
import { Injectable, Logger } from '@nestjs/common';
import type {
  AuthMailer,
  AuthMailerRecipient,
  AuthInvitationDetails,
} from './auth-mailer.interface';

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

  sendOrganizationInvitation(
    recipient: AuthMailerRecipient,
    rawToken: string,
    details: AuthInvitationDetails,
  ): Promise<void> {
    this.logger.warn(
      `[dev-only] Organization invitation for ${recipient.email}; ` +
        `organization=${details.organizationName}; role=${details.roleName}; ` +
        `token=${rawToken}`,
    );
    return Promise.resolve();
  }
}
