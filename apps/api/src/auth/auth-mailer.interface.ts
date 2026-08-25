export interface AuthMailerRecipient {
  email: string;
  firstName: string;
}

/**
 * Provider abstraction (SRS §5) so AuthService never depends on a concrete
 * email vendor. AUTH_MAILER is a stopgap ConsoleAuthMailer until Phase 6
 * builds the real templated notification pipeline (SRS §20) — swap the
 * provider bound to AUTH_MAILER then, nothing in AuthService changes.
 */
export interface AuthMailer {
  sendEmailVerification(
    recipient: AuthMailerRecipient,
    rawToken: string,
  ): Promise<void>;
  sendPasswordReset(
    recipient: AuthMailerRecipient,
    rawToken: string,
  ): Promise<void>;
}

export const AUTH_MAILER = Symbol('AUTH_MAILER');
